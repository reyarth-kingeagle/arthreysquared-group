\set ON_ERROR_STOP on
begin;
-- Synthetic fixtures only. Everything rolls back at the end of this test.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at) values
('11111111-1111-4111-8111-111111111111','security-student-a@example.invalid',now(),'{"full_name":"Student A","role":"admin"}',now(),now()),
('22222222-2222-4222-8222-222222222222','security-student-b@example.invalid',now(),'{"full_name":"Student B"}',now(),now()),
('33333333-3333-4333-8333-333333333333','security-instructor@example.invalid',now(),'{"full_name":"Instructor"}',now(),now()),
('44444444-4444-4444-8444-444444444444','security-unverified@example.invalid',null,'{}',now(),now());
update public.profiles set role='instructor' where id='33333333-3333-4333-8333-333333333333';
create temp table security_test_state(label text primary key,id uuid,payload jsonb);
grant select,insert,update on security_test_state to authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
set local role authenticated;
insert into security_test_state(label,id) values
('practice',public.save_assessment('{"subject_id":"msuiit-cet111","title":"Security test fixture only","access_type":"practice","max_attempts":1,"published":true}'::jsonb,
 '[{"prompt":"Synthetic test fixture","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"}],"correct_option_id":"a","explanation":"Synthetic explanation","points":2}]'::jsonb)),
('class',public.save_assessment('{"subject_id":"msuiit-cet111","title":"Restricted security fixture","access_type":"class","published":true}'::jsonb,
 '[{"prompt":"Synthetic restricted fixture","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"}],"correct_option_id":"a","points":1}]'::jsonb)),
('draft',public.save_assessment('{"subject_id":"msuiit-cet111","title":"Draft fixture","access_type":"practice","published":false}'::jsonb,
 '[{"prompt":"Draft question fixture","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"}],"correct_option_id":"a","points":1}]'::jsonb));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 if (select count(*) from public.subjects)<11 then raise exception 'FAIL public subjects'; end if;
 if exists(select 1 from public.assessments where title='Draft fixture') then raise exception 'FAIL draft visible anonymously'; end if;
 begin perform public.start_attempt('00000000-0000-4000-8000-000000000000'); raise exception 'FAIL anon start allowed'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$declare payload jsonb; aid uuid; qid text; result jsonb; second_result jsonb;
begin
 if (select role from public.profiles where id=auth.uid())<>'student' then raise exception 'FAIL metadata promoted role'; end if;
 begin update public.profiles set role='admin' where id=auth.uid(); raise exception 'FAIL self promotion allowed'; exception when insufficient_privilege then null; end;
 begin perform * from private.answer_keys; raise exception 'FAIL key read allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.questions; raise exception 'FAIL direct questions allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.results; raise exception 'FAIL direct results allowed'; exception when insufficient_privilege then null; end;
 begin perform public.instructor_overview(); raise exception 'FAIL student overview'; exception when insufficient_privilege then null; end;
 begin perform public.set_enrollment(auth.uid(),'msuiit-cet111','approved'); raise exception 'FAIL self approval'; exception when insufficient_privilege then null; end;
 perform public.request_enrollment('msuiit-cet111');
 if (select status from public.enrollments where user_id=auth.uid() and subject_id='msuiit-cet111')<>'pending' then raise exception 'FAIL pending request'; end if;
 begin perform public.start_attempt((select id from security_test_state where label='class')); raise exception 'FAIL pending class access'; exception when insufficient_privilege then null; end;
 begin perform public.start_attempt((select id from security_test_state where label='draft')); raise exception 'FAIL draft access'; exception when insufficient_privilege then null; end;
 payload:=public.start_attempt((select id from security_test_state where label='practice'));
 aid:=(payload->>'id')::uuid; qid:=payload->'questions'->0->>'id';
 if payload::text like '%correct_option_id%' or payload::text like '%Synthetic explanation%' then raise exception 'FAIL key or explanation in questions'; end if;
 if (public.start_attempt((select id from security_test_state where label='practice'))->>'id')::uuid<>aid then raise exception 'FAIL duplicate start'; end if;
 begin perform public.submit_attempt(aid,'{}'); raise exception 'FAIL incomplete submission'; exception when invalid_parameter_value then null; end;
 begin perform public.submit_attempt(aid,jsonb_build_object(qid,'injected')); raise exception 'FAIL invalid option'; exception when invalid_parameter_value then null; end;
 result:=public.submit_attempt(aid,jsonb_build_object(qid,'a'));
 if result->'score' is distinct from 'null'::jsonb or result->'answers'<>'[]'::jsonb or (result->>'released')::boolean then raise exception 'FAIL withheld score or key'; end if;
 second_result:=public.submit_attempt(aid,jsonb_build_object(qid,'b'));
 if second_result<>result then raise exception 'FAIL duplicate changed result'; end if;
 insert into security_test_state(label,id,payload) values('attempt',aid,result);
 begin perform public.start_attempt((select id from security_test_state where label='practice')); raise exception 'FAIL attempt limit'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
set local role authenticated;
do $$declare aid uuid:=(select id from security_test_state where label='attempt');
begin
 if exists(select 1 from public.attempts where id=aid) then raise exception 'FAIL other attempt visible by RLS'; end if;
 if public.my_results()<>'[]'::jsonb then raise exception 'FAIL other results in my_results'; end if;
 begin perform public.get_result(aid); raise exception 'FAIL other result RPC'; exception when insufficient_privilege then null; end;
 begin perform public.get_attempt(aid); raise exception 'FAIL other attempt RPC'; exception when insufficient_privilege then null; end;
 begin perform public.submit_attempt(aid,'{}'); raise exception 'FAIL other submission'; exception when insufficient_privilege then null; end;
 begin perform public.save_assessment('{}','[]'); raise exception 'FAIL student authoring'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
set local role authenticated;
do $$begin
 begin perform public.start_attempt((select id from security_test_state where label='practice')); raise exception 'FAIL unverified access'; exception when sqlstate '28000' then null; end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
set local role authenticated;
select public.set_enrollment('11111111-1111-4111-8111-111111111111','msuiit-cet111','approved');
select public.set_results_release((select id from security_test_state where label='practice'),now()-interval '1 minute');
do $$begin
 if jsonb_array_length(public.instructor_overview()->'submissions')<1 then raise exception 'FAIL instructor submissions'; end if;
 begin perform public.save_assessment(jsonb_build_object('id',(select id from security_test_state where label='practice')),
 '[{"prompt":"Changed fixture","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct_option_id":"a"}]');
 raise exception 'FAIL assessment history mutable'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$declare r jsonb; payload jsonb;
begin
 r:=public.get_result((select id from security_test_state where label='attempt'));
 if not (r->>'released')::boolean or (r->>'score')::numeric<>2 or (r->>'max_score')::numeric<>2 or r->'answers'->0->>'correct_option_id'<>'a' then raise exception 'FAIL released server score'; end if;
 payload:=public.start_attempt((select id from security_test_state where label='class'));
 insert into security_test_state(label,id,payload) values('class_attempt',(payload->>'id')::uuid,payload);
end;$$;
reset role;
update public.attempts set expires_at=clock_timestamp()-interval '1 second' where id=(select id from security_test_state where label='class_attempt');
set local role authenticated;
do $$declare aid uuid:=(select id from security_test_state where label='class_attempt');
begin
 begin perform public.submit_attempt(aid,'{}'); raise exception 'FAIL expired submission'; exception when insufficient_privilege then null; end;
 if public.get_attempt(aid)->>'status'<>'expired' then raise exception 'FAIL expired attempt state'; end if;
end;$$;
reset role;
update public.assessments set closes_at=clock_timestamp()-interval '1 second' where id=(select id from security_test_state where label='class');
set local role authenticated;
do $$begin
 begin perform public.start_attempt((select id from security_test_state where label='class')); raise exception 'FAIL closed assessment start'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
do $$begin
 if (select count(*) from public.results where attempt_id=(select id from security_test_state where label='attempt'))<>1 then raise exception 'FAIL double scoring'; end if;
 if exists(select 1 from public.results where attempt_id=(select id from security_test_state where label='class_attempt')) then raise exception 'FAIL expired attempt scored'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profiles','subjects','enrollments','assessments','questions','attempts','submitted_answers','results') and not c.relrowsecurity) then raise exception 'FAIL missing RLS'; end if;
 if has_function_privilege('anon','public.start_attempt(uuid)','EXECUTE') then raise exception 'FAIL anonymous RPC grant'; end if;
 if has_function_privilege('authenticated','private.attempt_payload(uuid)','EXECUTE') then raise exception 'FAIL unchecked helper exposed'; end if;
 if has_table_privilege('authenticated','private.answer_keys','SELECT') then raise exception 'FAIL answer key table grant'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('start_attempt','get_attempt','submit_attempt','get_result','save_assessment') and p.prosecdef) then raise exception 'FAIL exposed definer RPC'; end if;
 raise notice 'PASS: roles, enrollment, ownership, answer-key protection, release, scoring, attempts, expiry, and deadline fixtures.';
end;$$;
rollback;
