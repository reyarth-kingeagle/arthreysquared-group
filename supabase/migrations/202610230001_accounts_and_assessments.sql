begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (char_length(full_name) <= 120),
 role text not null default 'student' check (role in ('student','instructor','admin')),
 created_at timestamptz not null default now()
);
create table public.subjects (
 id text primary key, code text not null, title text not null,
 page_path text not null unique, institution text not null
);
create table public.enrollments (
 user_id uuid references public.profiles(id) on delete cascade,
 subject_id text references public.subjects(id),
 status text not null default 'pending' check (status in ('pending','approved','denied')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references public.profiles(id) on delete set null,
 primary key (user_id,subject_id)
);
create table public.assessments (
 id uuid primary key default gen_random_uuid(), subject_id text not null references public.subjects(id),
 title text not null check (char_length(title) between 1 and 200),
 instructions text not null default '' check (char_length(instructions)<=10000),
 access_type text not null check (access_type in ('practice','class')),
 opens_at timestamptz, closes_at timestamptz,
 max_attempts integer check (max_attempts between 1 and 100),
 time_limit_minutes integer check (time_limit_minutes between 1 and 1440),
 published boolean not null default false, results_release_at timestamptz,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 check (opens_at is null or closes_at is null or closes_at>opens_at)
);
create table public.questions (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.assessments(id) on delete cascade,
 position integer not null check (position>0),
 prompt text not null check (char_length(prompt) between 1 and 5000),
 options jsonb not null check (jsonb_typeof(options)='array'),
 points numeric(8,2) not null default 1 check (points>0 and points<=10000),
 unique(assessment_id,position)
);
create table private.answer_keys (
 question_id uuid primary key references public.questions(id) on delete cascade,
 correct_option_id text not null, explanation text not null default ''
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.assessments(id),
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
 started_at timestamptz not null default now(), expires_at timestamptz, submitted_at timestamptz
);
create unique index one_active_attempt on public.attempts(assessment_id,user_id) where status='in_progress';
create index attempts_owner on public.attempts(user_id,assessment_id);
create table public.submitted_answers (
 attempt_id uuid not null references public.attempts(id) on delete cascade,
 question_id uuid not null references public.questions(id),
 selected_option_id text,
 points_awarded numeric(8,2) not null check (points_awarded>=0),
 primary key(attempt_id,question_id)
);
create table public.results (
 attempt_id uuid primary key references public.attempts(id) on delete cascade,
 score numeric(12,2) not null, max_score numeric(12,2) not null,
 scored_at timestamptz not null default now(), check (score>=0 and score<=max_score)
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.submitted_answers enable row level security;
alter table public.results enable row level security;
alter table private.answer_keys enable row level security;

create function private.is_instructor() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('instructor','admin'));
$$;
create function private.require_user() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then
  raise exception 'Please sign in with a verified email to continue.' using errcode='28000';
 end if;
 return u;
end;
$$;
create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,role) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120),'student');
 return new;
end;
$$;
create trigger create_student_profile after insert on auth.users for each row execute function private.on_signup();
insert into public.profiles(id,full_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),120) from auth.users on conflict(id) do nothing;

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_instructor()));
create policy profiles_name_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy subjects_public on public.subjects for select to anon,authenticated using(true);
create policy enrollments_read on public.enrollments for select to authenticated using(user_id=(select auth.uid()) or (select private.is_instructor()));
create policy assessments_public on public.assessments for select to anon,authenticated using(published);
create policy assessments_instructor on public.assessments for select to authenticated using((select private.is_instructor()));
create policy questions_instructor on public.questions for select to authenticated using((select private.is_instructor()));
create policy attempts_read on public.attempts for select to authenticated using(user_id=(select auth.uid()) or (select private.is_instructor()));
create policy answers_released on public.submitted_answers for select to authenticated using(
 (select private.is_instructor()) or exists(select 1 from public.attempts t join public.assessments a on a.id=t.assessment_id
 where t.id=attempt_id and t.user_id=(select auth.uid()) and t.status='submitted' and a.results_release_at<=now())
);
create policy results_released on public.results for select to authenticated using(
 (select private.is_instructor()) or exists(select 1 from public.attempts t join public.assessments a on a.id=t.assessment_id
 where t.id=attempt_id and t.user_id=(select auth.uid()) and t.status='submitted' and a.results_release_at<=now())
);
-- No policy or browser grant exists on answer_keys. No client may mutate assessment tables.
revoke all on public.profiles,public.subjects,public.enrollments,public.assessments,public.questions,public.attempts,public.submitted_answers,public.results from public,anon,authenticated;
revoke all on private.answer_keys from public,anon,authenticated;
grant select on public.subjects,public.assessments to anon,authenticated;
grant select on public.profiles,public.enrollments,public.attempts to authenticated;
grant update(full_name) on public.profiles to authenticated;

create function private.check_access(a public.assessments,u uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not a.published then raise exception 'This assessment is unavailable.' using errcode='42501'; end if;
 if a.opens_at is not null and clock_timestamp()<a.opens_at then raise exception 'This assessment has not opened yet.' using errcode='42501'; end if;
 if a.closes_at is not null and clock_timestamp()>=a.closes_at then raise exception 'The assessment deadline has passed. No new answers were saved.' using errcode='42501'; end if;
 if a.access_type='class' and not private.is_instructor() and not exists(select 1 from public.enrollments where user_id=u and subject_id=a.subject_id and status='approved') then
  raise exception 'Instructor approval for this subject is required.' using errcode='42501';
 end if;
end;
$$;
create function private.result_payload(p_attempt_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.require_user(); t public.attempts; a public.assessments; r public.results; released boolean;
begin
 select * into t from public.attempts where id=p_attempt_id;
 if not found or (t.user_id<>u and not private.is_instructor()) then raise exception 'Attempt not found.' using errcode='42501'; end if;
 select * into a from public.assessments where id=t.assessment_id;
 select * into r from public.results where attempt_id=t.id;
 released:=t.status='submitted' and (private.is_instructor() or (a.results_release_at is not null and clock_timestamp()>=a.results_release_at));
 return jsonb_build_object('id',t.id,'assessment_id',a.id,'title',a.title,'subject_id',a.subject_id,
 'subject_code',(select code from public.subjects where id=a.subject_id),'status',t.status,'submitted_at',t.submitted_at,
 'released',released,'results_release_at',a.results_release_at,'score',case when released then r.score else null end,
 'max_score',case when released then r.max_score else null end,
 'answers',case when released then coalesce((select jsonb_agg(jsonb_build_object(
 'question_id',q.id,'prompt',q.prompt,'options',q.options,'selected_option_id',s.selected_option_id,
 'correct_option_id',k.correct_option_id,'explanation',k.explanation,'points_awarded',s.points_awarded,'max_points',q.points) order by q.position)
 from public.submitted_answers s join public.questions q on q.id=s.question_id join private.answer_keys k on k.question_id=q.id where s.attempt_id=t.id),'[]'::jsonb) else '[]'::jsonb end);
end;
$$;
create function private.attempt_payload(p_attempt_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',t.id,'assessment_id',a.id,'status',t.status,'started_at',t.started_at,'expires_at',t.expires_at,
 'title',a.title,'instructions',a.instructions,'subject_id',a.subject_id,'subject_code',s.code,'subject_title',s.title,
 'questions',case when t.status='in_progress' then coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'options',q.options,'position',q.position) order by q.position)
 from public.questions q where q.assessment_id=a.id),'[]'::jsonb) else '[]'::jsonb end)
 from public.attempts t join public.assessments a on a.id=t.assessment_id join public.subjects s on s.id=a.subject_id where t.id=p_attempt_id;
$$;

create function private.start_attempt(p_assessment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); a public.assessments; t public.attempts; deadline timestamptz;
begin
 select * into a from public.assessments where id=p_assessment_id for update;
 if not found then raise exception 'Assessment not found.' using errcode='42501'; end if;
 perform private.check_access(a,u);
 update public.attempts set status='expired' where assessment_id=a.id and user_id=u and status='in_progress' and expires_at<=clock_timestamp();
 select * into t from public.attempts where assessment_id=a.id and user_id=u and status='in_progress';
 if found then return private.attempt_payload(t.id); end if;
 if a.max_attempts is not null and (select count(*) from public.attempts where assessment_id=a.id and user_id=u)>=a.max_attempts then
  raise exception 'You have reached the attempt limit.' using errcode='42501';
 end if;
 if not exists(select 1 from public.questions where assessment_id=a.id) then raise exception 'This assessment has no questions and is unavailable.'; end if;
 deadline:=a.closes_at;
 if a.time_limit_minutes is not null then deadline:=least(deadline,clock_timestamp()+make_interval(mins=>a.time_limit_minutes)); end if;
 insert into public.attempts(assessment_id,user_id,expires_at) values(a.id,u,deadline) returning * into t;
 return private.attempt_payload(t.id);
end;
$$;
create function private.get_attempt(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t public.attempts; a public.assessments;
begin
 select * into t from public.attempts where id=p_attempt_id for update;
 if not found or t.user_id<>u then raise exception 'Attempt not found.' using errcode='42501'; end if;
 if t.status='in_progress' and t.expires_at<=clock_timestamp() then
  update public.attempts set status='expired' where id=t.id;
  return private.attempt_payload(t.id);
 end if;
 if t.status='in_progress' then
  select * into a from public.assessments where id=t.assessment_id;
  perform private.check_access(a,u);
 end if;
 return private.attempt_payload(t.id);
end;
$$;
create function private.submit_attempt(p_attempt_id uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t public.attempts; a public.assessments;
begin
 select * into t from public.attempts where id=p_attempt_id for update;
 if not found or t.user_id<>u then raise exception 'Attempt not found.' using errcode='42501'; end if;
 if t.status='submitted' then return private.result_payload(t.id); end if;
 if t.status<>'in_progress' or t.expires_at<=clock_timestamp() then raise exception 'This attempt has expired. No new answers were saved.' using errcode='42501'; end if;
 select * into a from public.assessments where id=t.assessment_id;
 perform private.check_access(a,u);
 if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>500000 then raise exception 'Invalid answer submission.' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>(select count(*) from public.questions where assessment_id=a.id) then raise exception 'Answer every question before submitting.' using errcode='22023'; end if;
 if exists(select 1 from jsonb_each(p_answers) e where jsonb_typeof(e.value)<>'string' or not exists(
  select 1 from public.questions q where q.assessment_id=a.id and q.id::text=e.key
  and exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=e.value#>>'{}')
 )) then raise exception 'An answer does not belong to this assessment or its permitted options.' using errcode='22023'; end if;
 insert into public.submitted_answers(attempt_id,question_id,selected_option_id,points_awarded)
 select t.id,q.id,p_answers->>q.id::text,case when p_answers->>q.id::text=k.correct_option_id then q.points else 0 end
 from public.questions q join private.answer_keys k on k.question_id=q.id where q.assessment_id=a.id;
 insert into public.results(attempt_id,score,max_score)
 select t.id,coalesce(sum(s.points_awarded),0),sum(q.points) from public.questions q
 join public.submitted_answers s on s.question_id=q.id and s.attempt_id=t.id where q.assessment_id=a.id;
 update public.attempts set status='submitted',submitted_at=clock_timestamp() where id=t.id;
 return private.result_payload(t.id);
end;
$$;
create function private.my_results() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(private.result_payload(id) order by started_at desc),'[]'::jsonb) into result from public.attempts where user_id=u;
 return result;
end;
$$;
create function private.request_enrollment(p_subject_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); e public.enrollments;
begin
 if not exists(select 1 from public.subjects where id=p_subject_id) then raise exception 'Unknown subject.' using errcode='22023'; end if;
 insert into public.enrollments(user_id,subject_id,status) values(u,p_subject_id,'pending') on conflict(user_id,subject_id) do nothing;
 select * into e from public.enrollments where user_id=u and subject_id=p_subject_id;
 return to_jsonb(e);
end;
$$;
create function private.set_enrollment(p_user_id uuid,p_subject_id text,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); e public.enrollments;
begin
 if not private.is_instructor() then raise exception 'Instructor access required.' using errcode='42501'; end if;
 if p_status is null or p_status not in ('pending','approved','denied') then raise exception 'Invalid enrollment status.' using errcode='22023'; end if;
 insert into public.enrollments(user_id,subject_id,status,reviewed_at,reviewed_by)
 values(p_user_id,p_subject_id,p_status,clock_timestamp(),u)
 on conflict(user_id,subject_id) do update set status=excluded.status,reviewed_at=excluded.reviewed_at,reviewed_by=excluded.reviewed_by returning * into e;
 return to_jsonb(e);
end;
$$;
create function private.instructor_overview() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_instructor() then raise exception 'Instructor access required.' using errcode='42501'; end if;
 return jsonb_build_object('enrollments',coalesce((select jsonb_agg(to_jsonb(d)) from (
 select e.user_id,e.subject_id,e.status,e.requested_at,p.full_name,u.email,s.code as subject_code
 from public.enrollments e join public.profiles p on p.id=e.user_id join auth.users u on u.id=e.user_id
 join public.subjects s on s.id=e.subject_id order by e.requested_at desc) d),'[]'::jsonb),
 'submissions',coalesce((select jsonb_agg(private.result_payload(t.id)||jsonb_build_object('user_id',t.user_id,'full_name',p.full_name,'email',u.email) order by t.submitted_at desc)
 from public.attempts t join public.profiles p on p.id=t.user_id join auth.users u on u.id=t.user_id where t.status='submitted'),'[]'::jsonb));
end;
$$;
create function private.save_assessment(p_assessment jsonb,p_questions jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); aid uuid; qid uuid; q jsonb; opts jsonb; pos integer:=0;
begin
 if not private.is_instructor() then raise exception 'Instructor access required.' using errcode='42501'; end if;
 if jsonb_typeof(p_assessment) is distinct from 'object' or jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'Provide assessment metadata and a question array.' using errcode='22023'; end if;
 if octet_length(p_assessment::text)>30000 or octet_length(p_questions::text)>1000000 or jsonb_array_length(p_questions) not between 1 and 200 then raise exception 'Provide 1 to 200 questions within the supported size.' using errcode='22023'; end if;
 aid:=nullif(p_assessment->>'id','')::uuid;
 if aid is not null then
  perform 1 from public.assessments where id=aid for update;
  if not found then raise exception 'Assessment not found.' using errcode='22023'; end if;
  if exists(select 1 from public.attempts where assessment_id=aid) then raise exception 'This assessment already has attempts. Create a new assessment to change its content.' using errcode='42501'; end if;
  update public.assessments set subject_id=p_assessment->>'subject_id',title=btrim(p_assessment->>'title'),instructions=coalesce(p_assessment->>'instructions',''),
   access_type=p_assessment->>'access_type',opens_at=nullif(p_assessment->>'opens_at','')::timestamptz,closes_at=nullif(p_assessment->>'closes_at','')::timestamptz,
   max_attempts=nullif(p_assessment->>'max_attempts','')::integer,time_limit_minutes=nullif(p_assessment->>'time_limit_minutes','')::integer,
   results_release_at=nullif(p_assessment->>'results_release_at','')::timestamptz,published=coalesce((p_assessment->>'published')::boolean,false) where id=aid;
  delete from public.questions where assessment_id=aid;
 else
  insert into public.assessments(subject_id,title,instructions,access_type,opens_at,closes_at,max_attempts,time_limit_minutes,results_release_at,published,created_by)
  values(p_assessment->>'subject_id',btrim(p_assessment->>'title'),coalesce(p_assessment->>'instructions',''),p_assessment->>'access_type',
   nullif(p_assessment->>'opens_at','')::timestamptz,nullif(p_assessment->>'closes_at','')::timestamptz,
   nullif(p_assessment->>'max_attempts','')::integer,nullif(p_assessment->>'time_limit_minutes','')::integer,
   nullif(p_assessment->>'results_release_at','')::timestamptz,coalesce((p_assessment->>'published')::boolean,false),u) returning id into aid;
 end if;
 for q in select value from jsonb_array_elements(p_questions) loop
  pos:=pos+1;
  if jsonb_typeof(q) is distinct from 'object' or jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'Every question needs an options array.' using errcode='22023'; end if;
  if jsonb_array_length(q->'options') not between 2 and 10 then raise exception 'Each question needs 2 to 10 options.' using errcode='22023'; end if;
  if char_length(btrim(coalesce(q->>'prompt',''))) not between 1 and 5000 or coalesce((q->>'points')::numeric,1)<=0 then raise exception 'Question prompt and points are invalid.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o) is distinct from 'object'
   or jsonb_typeof(o->'id') is distinct from 'string' or not (o->>'id' ~ '^[A-Za-z0-9_-]{1,40}$')
   or jsonb_typeof(o->'text') is distinct from 'string' or char_length(btrim(o->>'text')) not between 1 and 2000)
   or exists(select 1 from jsonb_array_elements(q->'options') o group by o->>'id' having count(*)>1)
   or not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=q->>'correct_option_id')
   or char_length(coalesce(q->>'explanation',''))>10000 then raise exception 'Question options, correct answer, or explanation are invalid.' using errcode='22023'; end if;
  select jsonb_agg(jsonb_build_object('id',o->>'id','text',o->>'text') order by ordinal) into opts from jsonb_array_elements(q->'options') with ordinality as options(o,ordinal);
  insert into public.questions(assessment_id,position,prompt,options,points)
  values(aid,pos,btrim(q->>'prompt'),opts,coalesce((q->>'points')::numeric,1)) returning id into qid;
  insert into private.answer_keys(question_id,correct_option_id,explanation) values(qid,q->>'correct_option_id',coalesce(q->>'explanation',''));
 end loop;
 return aid;
end;
$$;
create function private.update_my_name(p_full_name text) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); clean text:=btrim(coalesce(p_full_name,''));
begin
 if char_length(clean) not between 1 and 120 then raise exception 'Name must contain 1 to 120 characters.' using errcode='22023'; end if;
 update public.profiles set full_name=clean where id=u;
 return clean;
end;
$$;
create function private.set_results_release(p_assessment_id uuid,p_release_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_instructor() then raise exception 'Instructor access required.' using errcode='42501'; end if;
 update public.assessments set results_release_at=p_release_at where id=p_assessment_id;
 if not found then raise exception 'Assessment not found.' using errcode='22023'; end if;
end;
$$;

create function public.start_attempt(p_assessment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.start_attempt(p_assessment_id);$$;
create function public.get_attempt(p_attempt_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.get_attempt(p_attempt_id);$$;
create function public.submit_attempt(p_attempt_id uuid,p_answers jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.submit_attempt(p_attempt_id,p_answers);$$;
create function public.get_result(p_attempt_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.result_payload(p_attempt_id);$$;
create function public.my_results() returns jsonb language sql security invoker set search_path='' as $$select private.my_results();$$;
create function public.request_enrollment(p_subject_id text) returns jsonb language sql security invoker set search_path='' as $$select private.request_enrollment(p_subject_id);$$;
create function public.set_enrollment(p_user_id uuid,p_subject_id text,p_status text) returns jsonb language sql security invoker set search_path='' as $$select private.set_enrollment(p_user_id,p_subject_id,p_status);$$;
create function public.instructor_overview() returns jsonb language sql security invoker set search_path='' as $$select private.instructor_overview();$$;
create function public.save_assessment(p_assessment jsonb,p_questions jsonb) returns uuid language sql security invoker set search_path='' as $$select private.save_assessment(p_assessment,p_questions);$$;
create function public.update_my_name(p_full_name text) returns text language sql security invoker set search_path='' as $$select private.update_my_name(p_full_name);$$;
create function public.set_results_release(p_assessment_id uuid,p_release_at timestamptz) returns void language sql security invoker set search_path='' as $$select private.set_results_release(p_assessment_id,p_release_at);$$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_instructor(),private.start_attempt(uuid),private.get_attempt(uuid),private.submit_attempt(uuid,jsonb),private.result_payload(uuid),private.my_results(),private.request_enrollment(text),private.set_enrollment(uuid,text,text),private.instructor_overview(),private.save_assessment(jsonb,jsonb),private.update_my_name(text),private.set_results_release(uuid,timestamptz) to authenticated;
revoke all on function public.start_attempt(uuid),public.get_attempt(uuid),public.submit_attempt(uuid,jsonb),public.get_result(uuid),public.my_results(),public.request_enrollment(text),public.set_enrollment(uuid,text,text),public.instructor_overview(),public.save_assessment(jsonb,jsonb),public.update_my_name(text),public.set_results_release(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.start_attempt(uuid),public.get_attempt(uuid),public.submit_attempt(uuid,jsonb),public.get_result(uuid),public.my_results(),public.request_enrollment(text),public.set_enrollment(uuid,text,text),public.instructor_overview(),public.save_assessment(jsonb,jsonb),public.update_my_name(text),public.set_results_release(uuid,timestamptz) to authenticated;

insert into public.subjects(id,code,title,page_path,institution) values
('msuiit-cet111','CET 111','Architectural Drafting','Coursework/MSU-IIT/cet111.html','MSU-IIT'),
('msuiit-cet134','CET 134','Formworks and Scaffoldings','Coursework/MSU-IIT/cet134.html','MSU-IIT'),
('msuiit-cet154','CET 154','Reinforced Concrete Works','Coursework/MSU-IIT/cet154.html','MSU-IIT'),
('msuiit-bet117','BET 117','Technology Awareness','Coursework/MSU-IIT/bet117.html','MSU-IIT'),
('msuiit-ens150-2','ENS 150.2','Engineering Graphics','Coursework/MSU-IIT/ens150.2.html','MSU-IIT'),
('spc-bes1-2','BES 1.2','Engineering Drawing and Plans','Coursework/SPC/bes1.2.html','SPC'),
('spc-bes3','BES 3','Statics of Rigid Bodies','Coursework/SPC/bes3.html','SPC'),
('spc-em1','EM 1','Calculus 1','Coursework/SPC/em1.html','SPC'),
('spc-em2','EM 2','Calculus 2','Coursework/SPC/em2.html','SPC'),
('spc-em3','EM 3','Engineering Data Analysis','Coursework/SPC/em3.html','SPC'),
('spc-em4','EM 4','Differential Equations','Coursework/SPC/em4.html','SPC');
commit;
