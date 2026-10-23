import {sampleBlueprint,emptyBlueprint,verifyShape,validateBlueprint,blueprintRows,mappingRows,csvOf,CATEGORY_LABELS} from './blueprint-model.mjs';
const STORAGE='arthreysquared-blueprint-draft-v1';
let state;
try { state=verifyShape(JSON.parse(localStorage.getItem(STORAGE))) } catch { state=sampleBlueprint(); }
const $=id=>document.getElementById(id);
const node=(tag,cls='',text='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
const field=(label,value,onChange,type='text',opts={})=>{
  const wrap=node('label','builder-field'),span=node('span','',label);
  const inp=node(type==='textarea'?'textarea':type==='select'?'select':'input');
  if(type==='select'){ for(const [v,t] of Object.entries(opts.options||{})){const op=node('option','',t);op.value=v;inp.append(op)} }
  else if(type!=='textarea')inp.type=type;
  if(type==='number'){ inp.step=opts.step||'any'; if(opts.min!==undefined)inp.min=opts.min; }
  inp.value=value===null||value===undefined?'':String(value);
  inp.addEventListener('change',()=>onChange(type==='number'?(inp.value.trim()===''?null:Number(inp.value)):inp.value));
  wrap.append(span,inp);return wrap;
};
const action=(label,fn)=>{const b=node('button','btn btn-secondary',label);b.type='button';b.addEventListener('click',fn);return b};
function apply(fn){fn();render();try {localStorage.setItem(STORAGE,JSON.stringify(state)); $('save-status').textContent='Draft saved in this browser only.';}catch{$('save-status').textContent='Browser storage unavailable. Export JSON to keep your work.'}}
function confirmRemove(label,fn){if(window.confirm('Remove '+label+'? Linked mappings will also be removed.'))apply(fn)}
function courseFields(){
  const target=$('course-fields');target.replaceChildren();
  const c=state.course;
  for(const [key,title,type] of [['institution','Institution','text'],['code','Subject code','text'],['title','Subject title','text'],['term','Academic term','text'],['sections','Sections (comma separated)','text'],['syllabusSource','Syllabus reference (text only)','text'],['passingScore','Passing score (%) — optional','number'],['coThreshold','CO-attainment threshold (%) — optional','number'],['policyNote','Approval / policy notes','textarea']]){
    target.append(field(title,key==='sections'?c.sections.join(', '):c[key],v=>apply(()=>{
      if(key==='sections')c.sections=v.split(',').map(x=>x.trim()).filter(Boolean);else c[key]=v;
    }),type));
  }
  const weights=$('weight-fields');weights.replaceChildren();
  for(const [key,label] of Object.entries(CATEGORY_LABELS))weights.append(field(label+' (%)',state.categoryWeights[key],v=>apply(()=>{state.categoryWeights[key]=v??0}),'number',{min:0}));
}
function outcomes(){
  const box=$('outcomes');box.replaceChildren();
  state.outcomes.forEach((co,index)=>{
    const card=node('div','builder-record'),head=node('div','builder-panel-heading');
    head.append(node('h3','',co.id||'New CO'),action('Remove CO',()=>confirmRemove(co.id,()=>{
      state.outcomes.splice(index,1);
      state.modules.forEach(m=>m.ilos.forEach(i=>i.coIds=i.coIds.filter(x=>x!==co.id)));
    })));card.append(head);
    card.append(field('CO identifier',co.id,v=>apply(()=>{const old=co.id;co.id=v;state.modules.forEach(m=>m.ilos.forEach(i=>i.coIds=i.coIds.map(x=>x===old?v:x)))})));
    card.append(field('Outcome description',co.description,v=>apply(()=>{co.description=v}),'textarea'));box.append(card);
  });
}
function moduleEditor(){
  const box=$('modules');box.replaceChildren();
  state.modules.forEach((m,idx)=>{
    const wrap=node('div','builder-record'),heading=node('div','builder-panel-heading');
    heading.append(node('h3','',m.id+' · '+m.title),action('Remove module',()=>confirmRemove(m.id,()=>{
      state.assessments=state.assessments.filter(a=>a.moduleId!==m.id);state.modules.splice(idx,1);
    })));wrap.append(heading);
    const grid=node('div','builder-grid');
    grid.append(field('Module ID',m.id,v=>apply(()=>{const old=m.id;m.id=v;state.assessments.forEach(a=>{if(a.moduleId===old)a.moduleId=v})})),
      field('Module title',m.title,v=>apply(()=>{m.title=v})),
      field('Start week',m.startWeek,v=>apply(()=>{m.startWeek=v}),'number',{min:1,step:'1'}),
      field('End week',m.endWeek,v=>apply(()=>{m.endWeek=v}),'number',{min:1,step:'1'}));
    wrap.append(grid);
    const header=node('div','builder-panel-heading');header.append(node('h4','','Intended Learning Outcomes'),action('+ Add ILO',()=>apply(()=>{
      const ids=new Set(state.modules.flatMap(x=>x.ilos.map(i=>i.id)));let n=1;while(ids.has('ILO'+n))n++;
      m.ilos.push({id:'ILO'+n,description:'',coIds:[]});
    })));wrap.append(header);
    m.ilos.forEach((ilo,i)=>{
      const row=node('div','builder-subrecord');
      const line=node('div','builder-panel-heading');
      line.append(node('strong','',ilo.id),action('Remove ILO',()=>confirmRemove(ilo.id,()=>{
        m.ilos.splice(i,1);state.assessments.forEach(a=>a.allocations=a.allocations.filter(x=>x.iloId!==ilo.id));
      })));
      row.append(line,field('ILO ID',ilo.id,v=>apply(()=>{
        const old=ilo.id;ilo.id=v;state.assessments.forEach(a=>a.allocations.forEach(x=>{if(x.iloId===old)x.iloId=v}));
      })),field('Learning outcome',ilo.description,v=>apply(()=>{ilo.description=v}),'textarea'));
      const fl=node('fieldset','builder-checks');fl.append(node('legend','','Map to CO(s)'));
      state.outcomes.forEach(co=>{
        const lab=node('label'),input=node('input');input.type='checkbox';input.checked=ilo.coIds.includes(co.id);
        input.addEventListener('change',()=>apply(()=>{
          ilo.coIds=input.checked?[...new Set([...ilo.coIds,co.id])]:ilo.coIds.filter(x=>x!==co.id);
        }));
        lab.append(input,document.createTextNode(' '+co.id));fl.append(lab);
      });
      row.append(fl);wrap.append(row);
    });box.append(wrap);
  });
}
function assessments(){
  const box=$('assessments');box.replaceChildren();
  state.assessments.forEach((a,idx)=>{
    const card=node('div','builder-record'),head=node('div','builder-panel-heading');
    head.append(node('h3','',a.id+' · '+a.title),action('Remove assessment',()=>confirmRemove(a.id,()=>state.assessments.splice(idx,1))));card.append(head);
    const grid=node('div','builder-grid');
    grid.append(field('Assessment ID (e.g., QILO1)',a.id,v=>apply(()=>{a.id=v})),
      field('Assessment title',a.title,v=>apply(()=>{a.title=v})),
      field('Grading category',a.category,v=>apply(()=>{a.category=v}),'select',{options:CATEGORY_LABELS}),
      field('Module',a.moduleId,v=>apply(()=>{a.moduleId=v;a.allocations=[]}),'select',{options:Object.fromEntries(state.modules.map(m=>[m.id,m.id+' — '+m.title]))}),
      field('Assessment date',a.date,v=>apply(()=>{a.date=v}),'date'),
      field('Maximum points',a.maxPoints,v=>apply(()=>{a.maxPoints=v}),'number',{min:0}));
    card.append(grid);
    const allocHeader=node('div','builder-panel-heading');
    allocHeader.append(node('h4','','ILO point allocations'),action('+ Link ILO',()=>apply(()=>{
      const m=state.modules.find(m=>m.id===a.moduleId);
      const unused=m?.ilos.find(i=>!a.allocations.some(x=>x.iloId===i.id));
      if(unused)a.allocations.push({iloId:unused.id,points:null});
    })));card.append(allocHeader);
    const module=state.modules.find(m=>m.id===a.moduleId);
    for(const [j,alloc] of a.allocations.entries()){
      const line=node('div','builder-allocation');
      line.append(field('ILO',alloc.iloId,v=>apply(()=>{alloc.iloId=v}),'select',{options:Object.fromEntries((module?.ilos||[]).map(i=>[i.id,i.id]))}),
        field('Allocated points',alloc.points,v=>apply(()=>{alloc.points=v}),'number',{min:0}),
        action('Remove link',()=>apply(()=>a.allocations.splice(j,1))));
      card.append(line);
    }
    box.append(card);
  });
}
function review(){
  const issues=validateBlueprint(state),errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');
  const metrics=$('metrics');metrics.replaceChildren();
  for(const [value,title] of [[state.outcomes.length,'COs'],[state.modules.length,'Modules'],[state.modules.reduce((n,m)=>n+m.ilos.length,0),'ILOs'],[state.assessments.length,'Assessments']]){
    const div=node('div','builder-metric');div.append(node('strong','',String(value)),node('span','',title));metrics.append(div);
  }
  $('issue-count').textContent=errors.length+' blocking issue(s) · '+warnings.length+' review warning(s)';
  const list=$('issues');list.replaceChildren();
  if(!issues.length)list.append(node('li','builder-ok','No mapping or configuration issues detected. Review syllabus approval before operational use.'));
  issues.forEach(x=>list.append(node('li','builder-'+x.severity,x.message)));
}
function render(){courseFields();outcomes();moduleEditor();assessments();review();}
function download(name,body,mime){
  const url=URL.createObjectURL(new Blob([body],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
const base=()=>((state.course.code||'course').replace(/[^a-z0-9_-]/gi,'_').slice(0,32));
$('add-outcome').addEventListener('click',()=>apply(()=>{
  let n=1;const ids=new Set(state.outcomes.map(x=>x.id));while(ids.has('CO'+n))n++;
  state.outcomes.push({id:'CO'+n,description:''});
}));
$('add-module').addEventListener('click',()=>apply(()=>{
  let n=1;const ids=new Set(state.modules.map(x=>x.id));while(ids.has('M'+n))n++;
  state.modules.push({id:'M'+n,title:'',startWeek:1,endWeek:1,ilos:[]});
}));
$('add-assessment').addEventListener('click',()=>apply(()=>{
  let n=1;const ids=new Set(state.assessments.map(x=>x.id));while(ids.has('A'+n))n++;
  state.assessments.push({id:'A'+n,title:'',category:'quizzes',moduleId:state.modules[0]?.id||'',date:'',maxPoints:null,allocations:[]});
}));
$('sample').addEventListener('click',()=>{if(confirm('Replace the current local draft with the CET154 example? Export first to keep your work.'))apply(()=>{state=sampleBlueprint()})});
$('blank').addEventListener('click',()=>{if(confirm('Replace the current local draft with a blank course? Export first to keep your work.'))apply(()=>{state=emptyBlueprint()})});
$('export').addEventListener('click',()=>download(base()+'-blueprint.json',JSON.stringify(state,null,2),'application/json'));
$('export-mapping').addEventListener('click',()=>download(base()+'-ilo-co-map.csv',csvOf(mappingRows(state)),'text/csv;charset=utf-8'));
$('export-assessment').addEventListener('click',()=>download(base()+'-assessment-blueprint.csv',csvOf(blueprintRows(state)),'text/csv;charset=utf-8'));
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>1024*1024)throw Error('JSON draft must be smaller than 1 MB.');
    const incoming=verifyShape(JSON.parse(await file.text()));
    if(confirm('Replace current draft with this imported blueprint? Export first to keep your work.'))apply(()=>{state=incoming});
  }catch(err){$('save-status').textContent='Import failed: '+err.message;}
  e.target.value='';
});
render();
