// Pure, side-effect-free OBE-CQI course-blueprint model. No student data or credentials.
export const CATEGORY_LABELS = Object.freeze({
  examinations: 'Major Examinations',
  laboratory: 'Laboratory Activities & Performance Tasks',
  capstone: 'Capstone / Reporting',
  quizzes: 'Quizzes'
});
const CATEGORY_WEIGHTS = Object.freeze({ examinations:50, laboratory:35, capstone:10, quizzes:5 });
export const SCHEMA_VERSION = 1;

export function sampleBlueprint() {
  return {
    schemaVersion: SCHEMA_VERSION,
    course: {
      institution: 'MSU-IIT', code: 'CET154', title: 'Reinforced Concrete Works',
      term: '', sections: ['Section A', 'Section B'],
      syllabusSource: 'CET154 - Reinforce Concrete Works Syllabus (uploaded reference)',
      passingScore: null, coThreshold: null,
      // Source has conflicting 70% evaluation and 65% grade-equivalence references.
      policyNote: 'Confirm the approved course passing and CO-attainment rules before operational use.'
    },
    categoryWeights: { ...CATEGORY_WEIGHTS },
    outcomes: [
      { id:'CO1', description:'Estimate concrete and reinforcement materials for structural elements and apply appropriate concrete mix proportions.' },
      { id:'CO2', description:'Detail, fabricate, and install reinforcement for RC elements in accordance with structural drawings and NSCP.' },
      { id:'CO3', description:'Execute concrete construction and special applications; evaluate safety and quality compliance.' }
    ],
    modules: [{
      id:'M1', title:'Fundamentals of Concrete Technology', startWeek:1, endWeek:3,
      ilos: [
        { id:'ILO1', description:'Explain the composition and behavior of plain versus reinforced concrete and principles of mixing.', coIds:['CO1'] },
        { id:'ILO2', description:'Identify and select cement, aggregates, admixtures, tools and equipment for concrete works.', coIds:['CO1'] },
        { id:'ILO3', description:'Compute mix proportions and convert to batch quantities by weight and volume.', coIds:['CO1'] }
      ]
    }],
    assessments: [
      { id:'QILO1', title:'True or False — concrete principles', category:'quizzes', moduleId:'M1', date:'', maxPoints:null, allocations:[{iloId:'ILO1',points:null}] },
      { id:'QILO2', title:'Concrete materials and tools identification', category:'quizzes', moduleId:'M1', date:'', maxPoints:null, allocations:[{iloId:'ILO2',points:null}] },
      { id:'QILO3', title:'Concrete proportioning calculations', category:'quizzes', moduleId:'M1', date:'', maxPoints:null, allocations:[{iloId:'ILO3',points:null}] },
      { id:'L1', title:'Trial batching and mixing laboratory', category:'laboratory', moduleId:'M1', date:'', maxPoints:null, allocations:[{iloId:'ILO3',points:null}] }
    ]
  };
}

export function emptyBlueprint() {
  const data = sampleBlueprint();
  data.course = { institution:'', code:'', title:'', term:'', sections:[], syllabusSource:'', passingScore:null, coThreshold:null, policyNote:'' };
  data.outcomes = [];
  data.modules = [];
  data.assessments = [];
  return data;
}

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const validPct = value => finite(value) && value >= 0 && value <= 100;
const cleanId = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9._-]{0,39}$/.test(value);

export function verifyShape(data) {
  if (!plain(data) || data.schemaVersion !== SCHEMA_VERSION || !plain(data.course) ||
      !plain(data.categoryWeights) || !Array.isArray(data.outcomes) ||
      !Array.isArray(data.modules) || !Array.isArray(data.assessments)) {
    throw new Error('Not a supported ARTHREYSQUARED blueprint (schema version 1).');
  }
  const c = data.course;
  if (['institution','code','title','term','syllabusSource','policyNote'].some(k=>typeof c[k] !== 'string') ||
      !Array.isArray(c.sections) || c.sections.some(s=>typeof s !== 'string') ||
      ![c.passingScore,c.coThreshold].every(v=>v === null || finite(v)) ||
      Object.keys(CATEGORY_LABELS).some(k=>!finite(data.categoryWeights[k]))) {
    throw new Error('The course configuration has invalid field types.');
  }
  if (data.outcomes.length > 50 || data.modules.length > 80 || data.assessments.length > 500 ||
      data.modules.some(m=>!plain(m) || typeof m.id !== 'string' || typeof m.title !== 'string' ||
        !finite(m.startWeek) || !finite(m.endWeek) || !Array.isArray(m.ilos) || m.ilos.length > 100 ||
        m.ilos.some(i=>!plain(i) || typeof i.id !== 'string' || typeof i.description !== 'string' ||
          !Array.isArray(i.coIds) || i.coIds.some(v=>typeof v !== 'string'))) ||
      data.outcomes.some(o=>!plain(o) || typeof o.id !== 'string' || typeof o.description !== 'string') ||
      data.assessments.some(a=>!plain(a) || ['id','title','category','moduleId','date'].some(k=>typeof a[k] !== 'string') ||
        !(a.maxPoints === null || finite(a.maxPoints)) || !Array.isArray(a.allocations) || a.allocations.length > 100 ||
        a.allocations.some(x=>!plain(x) || typeof x.iloId !== 'string' ||
          !(x.points === null || finite(x.points))))) {
    throw new Error('The blueprint contains invalid records or exceeds size limits.');
  }
  return data;
}

export function validateBlueprint(data) {
  verifyShape(data);
  const issues = [];
  const add = (severity,message) => issues.push({severity,message});
  const course = data.course;
  if (!course.code.trim() || !course.title.trim() || !course.institution.trim()) add('error','Enter institution, course code and course title.');
  if (!course.sections.length || course.sections.some(x=>!x.trim()) ||
      new Set(course.sections.map(x=>x.trim().toLowerCase())).size !== course.sections.length)
    add('warning','Enter unique section names before generating section-specific class records.');
  const weights = Object.keys(CATEGORY_LABELS).map(k=>data.categoryWeights[k]);
  if (weights.some(v=>!validPct(v)) || Math.abs(weights.reduce((s,v)=>s+v,0)-100)>0.00001)
    add('error','Category weights must each be 0–100 and total exactly 100%.');
  if (course.passingScore !== null && !validPct(course.passingScore)) add('error','The course passing threshold must be 0–100%.');
  if (course.coThreshold !== null && !validPct(course.coThreshold)) add('error','The CO-attainment threshold must be 0–100%.');
  if (course.passingScore === null) add('warning','Course passing threshold requires syllabus/institutional confirmation.');
  if (course.coThreshold === null) add('warning','CO-attainment threshold has not been approved or entered.');
  if (!data.outcomes.length) add('error','Add at least one course outcome.');
  if (!data.modules.length) add('error','Add at least one module.');
  const coIds = new Set();
  for (const o of data.outcomes) {
    if (!cleanId(o.id) || !o.description.trim()) add('error','Each CO needs a valid ID and description.');
    if (coIds.has(o.id)) add('error','Duplicate CO ID: ' + o.id);
    coIds.add(o.id);
  }
  const moduleIds = new Set(), iloIds = new Set(), iloModule = new Map();
  for (const m of data.modules) {
    if (!cleanId(m.id) || !m.title.trim()) add('error','Each module needs a valid ID and title.');
    if (moduleIds.has(m.id)) add('error','Duplicate module ID: ' + m.id);
    moduleIds.add(m.id);
    if (!Number.isInteger(m.startWeek) || !Number.isInteger(m.endWeek) || m.startWeek < 1 || m.endWeek < m.startWeek)
      add('error',m.id + ': enter a valid start and end week.');
    if (!m.ilos.length) add('warning',m.id + ' has no ILOs.');
    for (const i of m.ilos) {
      if (!cleanId(i.id) || !i.description.trim()) add('error','Each ILO needs a valid ID and description.');
      if (iloIds.has(i.id)) add('error','Duplicate ILO ID: ' + i.id);
      iloIds.add(i.id); iloModule.set(i.id,m.id);
      if (!i.coIds.length) add('error',i.id + ' is not mapped to any CO.');
      if (new Set(i.coIds).size !== i.coIds.length || i.coIds.some(id=>!coIds.has(id)))
        add('error',i.id + ' has a duplicate or nonexistent CO mapping.');
    }
  }
  const assessmentIds = new Set(), assessedIlos = new Set();
  for (const a of data.assessments) {
    if (!cleanId(a.id) || !a.title.trim()) add('error','Each assessment needs a valid ID and title.');
    if (assessmentIds.has(a.id)) add('error','Duplicate assessment ID: ' + a.id);
    assessmentIds.add(a.id);
    if (!moduleIds.has(a.moduleId)) add('error',a.id + ' references a missing module.');
    if (!Object.hasOwn(CATEGORY_LABELS,a.category)) add('error',a.id + ' has an invalid grading category.');
    if (a.date && !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) add('error',a.id + ' has an invalid assessment date.');
    if (a.maxPoints === null) add('warning',a.id + ': enter the maximum possible score.');
    else if (a.maxPoints <= 0) add('error',a.id + ': maximum score must be positive.');
    if (!a.allocations.length) add('error',a.id + ' needs at least one ILO/score allocation.');
    const mapped = new Set();
    let pointsSum = 0, complete = true;
    for (const x of a.allocations) {
      if (mapped.has(x.iloId) || iloModule.get(x.iloId) !== a.moduleId)
        add('error',a.id + ' has a duplicate or cross-module/invalid ILO: ' + x.iloId);
      mapped.add(x.iloId); assessedIlos.add(x.iloId);
      if (x.points === null) complete = false;
      else if (x.points <= 0) add('error',a.id + ': ILO allocated points must be positive.');
      else pointsSum += x.points;
    }
    if (!complete) add('warning',a.id + ': specify the points allocated to every linked ILO.');
    else if (a.maxPoints !== null && Math.abs(pointsSum-a.maxPoints)>0.00001)
      add('error',a.id + ': ILO allocation points (' + pointsSum + ') must equal maximum points (' + a.maxPoints + ').');
  }
  for (const id of iloIds) if (!assessedIlos.has(id)) add('warning',id + ' has no linked assessment evidence.');
  if (!data.assessments.length) add('warning','No assessments have been added.');
  return issues;
}

export function blueprintRows(data) {
  verifyShape(data);
  const outcomeOf = new Map();
  for (const m of data.modules) for (const i of m.ilos) outcomeOf.set(i.id,i.coIds.join(' | '));
  return data.assessments.flatMap(a=>a.allocations.length ?
    a.allocations.map(x=>({
      course:data.course.code, assessment_id:a.id, assessment_title:a.title, module_id:a.moduleId,
      category:a.category, category_weight_percent:data.categoryWeights[a.category],
      date:a.date, max_points:a.maxPoints, ilo_id:x.iloId, allocated_points:x.points,
      mapped_co_ids:outcomeOf.get(x.iloId) || ''
    })) :
    [{course:data.course.code,assessment_id:a.id,assessment_title:a.title,module_id:a.moduleId,
      category:a.category,category_weight_percent:data.categoryWeights[a.category],
      date:a.date,max_points:a.maxPoints,ilo_id:'',allocated_points:'',mapped_co_ids:''}]);
}

export function mappingRows(data) {
  verifyShape(data);
  return data.modules.flatMap(m=>m.ilos.flatMap(i=>i.coIds.length ?
    i.coIds.map(co=>({ course:data.course.code,module_id:m.id,module_title:m.title,week_start:m.startWeek,
      week_end:m.endWeek,ilo_id:i.id,ilo_description:i.description,co_id:co })) :
    [{ course:data.course.code,module_id:m.id,module_title:m.title,week_start:m.startWeek,
      week_end:m.endWeek,ilo_id:i.id,ilo_description:i.description,co_id:'' }]));
}

export function csvOf(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    let s = v === null || v === undefined ? '' : String(v);
    // Protect spreadsheet consumers from formula injection in imported CSV.
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"','""') + '"';
  };
  return [headers.map(escape).join(','), ...rows.map(row=>headers.map(h=>escape(row[h])).join(','))].join('\r\n') + '\r\n';
}
