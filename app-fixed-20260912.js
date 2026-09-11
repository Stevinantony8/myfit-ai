import { calculateMetrics } from './calculations.js';
import { generatePlan } from './recommendations.js';
import { saveState, loadState, clearState } from './storage.js';
import { DEMO_PROFILE } from './demo.js';
import { escapeHtml, renderProgress, optionCard, metricCard } from './ui.js';
import { PRESENTATION_STEPS, presentationSlideHtml } from './presentation.js';
import { openPrintableReport } from './report.js';

const root = document.getElementById('main-content');
const bottomNav = document.getElementById('bottom-nav');
const toast = document.getElementById('toast');

const initial = {
  screen: 'landing',
  wizardStep: 0,
  profile: {
    isDemo:false, name:'', age:'', sex:'male', heightCm:'', weightKg:'', targetWeightKg:'', targetDate:'',
    dietType:'non-vegetarian', gymAccess:true, workoutDays:3, workoutMinutes:30, goal:'fitness', activityLevel:'moderate',
    trainingExperience:'beginner', equipment:['none','dumbbells','machine','cable','bench','treadmill','bike','stairs'], injuryOrMedicalConcern:'', pregnancyStatus:'not_applicable', significantMedicalCondition:false, eatingConcern:false, dailySteps:'', sleepHours:7, stressLevel:'moderate', cuisinePreference:'mixed', allergies:'', dislikedFoods:'', mealsPerDay:4, cookingAvailability:'moderate', budget:'medium', eatingOutFrequency:'sometimes', workoutTiming:'flexible'
  },
  metrics:null, plan:null,
  progress:{ workoutsCompleted:0, habitsCompleted:0, weightEntries:[] }
};
let state = {...initial, ...(loadState() || {})};
state.profile = {...initial.profile, ...(state.profile || {})};
state.progress = {...initial.progress, ...(state.progress || {})};
state.theme = state.theme || 'premium';
state.photoData = state.photoData || '';
state.presentationSlide = Number(state.presentationSlide||0);
state.presentationPlaying = false;
let presentationTimer = null;

function applyTheme(){ document.documentElement.dataset.theme = state.theme || 'premium'; }
applyTheme();

function persist(){ const ok=saveState(state); applyTheme(); if(!ok) showToast('Local storage is full. Remove the photo or export/clear data to continue saving changes.'); return ok; }
function setScreen(screen){ state.screen=screen; persist(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function showToast(message){ toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2200); }
function rebuildPlan(){
  state.metrics = calculateMetrics({
    ...state.profile,
    targetKg: state.profile.targetWeightKg,
    currentKg: state.profile.weightKg
  });
  state.plan = generatePlan(state.profile, state.metrics);
  persist();
}

function render(){
  bottomNav.style.display = ['landing','questionnaire','loading','presentation'].includes(state.screen) ? 'none' : '';
  const screens = {
    landing: renderLanding,
    questionnaire: renderQuestionnaire,
    reality: renderReality,
    loading: renderLoading,
    dashboard: renderDashboard,
    plan: renderPlan,
    progress: renderProgressScreen,
    privacy: renderPrivacy,
    themes: renderThemes,
    presentation: renderPresentation
  };
  root.innerHTML = (screens[state.screen] || renderLanding)();
  bindEvents();
}

function renderLanding(){
  return `<section class="hero fade-up">
    <div>
      <div class="eyebrow">Personal Wellness & Fitness Planner</div>
      <h1 style="margin-top:16px;">Your fitness plan.<br><span class="gradient-text">Built around you.</span></h1>
      <p>MYFIT AI turns your goal, lifestyle, food preferences and available time into an actionable wellness plan — entirely in your browser.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" data-action="start">Build My Plan →</button>
        <button class="btn btn-secondary" data-action="demo">▶ Explore Demo Mode</button>
      </div>
      <div class="footer-note">Privacy-first by design · No paid AI API · Fictional demo mode included · Wellness tool, not medical advice.</div>
    </div>
    <div class="hero-visual">
      <div class="preview-orb"></div>
      <div class="glass-card dashboard-preview">
        <div class="preview-head"><div><span class="pill">LIVE PREVIEW</span><h3 style="margin-top:10px;">Your week at a glance</h3></div><span class="tiny">MYFIT AI</span></div>
        <div class="mini-grid">
          <div class="mini-stat"><b>82%</b><small>Consistency</small></div>
          <div class="mini-stat"><b>3/4</b><small>Workouts</small></div>
          <div class="mini-stat"><b>−2.4kg</b><small>Trend</small></div>
          <div class="mini-stat"><b>6 days</b><small>Best streak</small></div>
        </div>
        <div class="preview-progress"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px"><span>8-week journey</span><span class="muted">62%</span></div><div class="progress-track"><div class="progress-value" style="width:62%"></div></div></div>
        <div class="notice" style="margin-top:14px"><strong>Today</strong><div class="tiny" style="margin-top:6px">Protein-focused lunch · 30 min movement · 7+ hours sleep</div></div>
      </div>
    </div>
  </section>`;
}

const steps = [
  {key:'basics', title:'Let’s start with you.', subtitle:'A few core details help MYFIT AI personalize your plan.'},
  {key:'goal', title:'What are we working toward?', subtitle:'Your goal changes the way the recommendation engine prioritizes food and activity.'},
  {key:'lifestyle', title:'Make it fit your life.', subtitle:'Answer only what matters for your chosen goal.'},
  {key:'preferences', title:'Finish your preferences.', subtitle:'We’ll use these to filter practical recommendations.'},
  {key:'safety', title:'One important safety check.', subtitle:'These answers change what MYFIT AI is allowed to recommend.'}
];

function renderQuestionnaire(){
  const s = steps[state.wizardStep];
  return `<section class="wizard fade-up">
    <div class="wizard-top"><div><div class="eyebrow">Personalization</div><div class="tiny">Step ${state.wizardStep+1} of ${steps.length}</div></div>${renderProgress(state.wizardStep+1,steps.length)}</div>
    <div class="question-card">
      <h2>${s.title}</h2><p class="muted" style="margin:10px 0 26px;line-height:1.6">${s.subtitle}</p>
      ${renderStepBody(state.wizardStep)}
      <div class="wizard-actions">
        <button class="btn btn-secondary" data-action="prev-step" ${state.wizardStep===0?'disabled':''}>← Back</button>
        <button class="btn btn-primary" data-action="next-step">${state.wizardStep===steps.length-1?'Build my plan':'Continue →'}</button>
      </div>
      <div class="footer-note">General wellness planning only. The tool does not diagnose conditions or provide medical treatment.</div>
    </div>
  </section>`;
}

function renderStepBody(step){
  const p=state.profile;
  if(step===0) return `<div class="grid grid-2">
    <div class="field"><label>Name or nickname</label><input data-field="name" value="${escapeHtml(p.name)}" placeholder="e.g. Arjun"></div>
    <div class="field"><label>Age</label><input data-field="age" type="number" min="13" max="100" value="${escapeHtml(p.age)}"></div>
    <div class="field"><label>Sex</label><select data-field="sex"><option value="male" ${p.sex==='male'?'selected':''}>Male</option><option value="female" ${p.sex==='female'?'selected':''}>Female</option><option value="other" ${p.sex==='other'?'selected':''}>Prefer not to say</option></select></div>
    <div class="field"><label>Height (cm)</label><input data-field="heightCm" type="number" min="100" max="250" value="${escapeHtml(p.heightCm)}"></div>
    <div class="field"><label>Current weight (kg)</label><input data-field="weightKg" type="number" min="30" max="300" step="0.1" value="${escapeHtml(p.weightKg)}"></div>
  </div>`;
  if(step===1) return `<div class="option-grid">
    ${optionCard('🔥 Fat loss','Reduce body weight with a practical, sustainable routine.',p.goal,'fatloss','Nutrition + activity emphasis')}
    ${optionCard('💪 Muscle + fitness','Build strength and improve overall fitness.',p.goal,'muscle','Strength + protein emphasis')}
    ${optionCard('⚡ General fitness','Improve movement, stamina and lifestyle consistency.',p.goal,'fitness','Balanced plan')}
  </div>`;
  if(step===2){
    const muscle=p.goal==='muscle';
    return `<div class="grid grid-2">
      <div class="field"><label>Target weight (kg)</label><input data-field="targetWeightKg" type="number" min="30" max="300" step="0.1" value="${escapeHtml(p.targetWeightKg)}"></div>
      <div class="field"><label>Target date</label><input data-field="targetDate" type="date" value="${escapeHtml(p.targetDate)}"></div>
      <div class="field"><label>Activity level</label><select data-field="activityLevel"><option value="sedentary" ${p.activityLevel==='sedentary'?'selected':''}>Mostly seated</option><option value="light" ${p.activityLevel==='light'?'selected':''}>Lightly active</option><option value="moderate" ${p.activityLevel==='moderate'?'selected':''}>Moderately active</option><option value="high" ${p.activityLevel==='high'?'selected':''}>Very active</option></select></div>
      <div class="field"><label>Workout access</label><select data-field="gymAccess"><option value="true" ${p.gymAccess?'selected':''}>Gym available</option><option value="false" ${!p.gymAccess?'selected':''}>No gym</option></select></div>
      <div class="field"><label>Days available per week</label><input data-field="workoutDays" type="number" min="2" max="6" value="${escapeHtml(p.workoutDays)}"></div>
      <div class="field"><label>Time per session (minutes)</label><input data-field="workoutMinutes" type="number" min="15" max="180" value="${escapeHtml(p.workoutMinutes)}"></div>
      <div class="field"><label>Training experience</label><select data-field="trainingExperience"><option value="beginner" ${p.trainingExperience==='beginner'?'selected':''}>Beginner</option><option value="intermediate" ${p.trainingExperience==='intermediate'?'selected':''}>Intermediate</option><option value="advanced" ${p.trainingExperience==='advanced'?'selected':''}>Advanced</option></select></div>
      <div class="field"><label>Equipment available</label><select data-field="equipment" multiple size=4>${['none','dumbbells','machine','cable','bench','treadmill','bike','stairs'].map(x=>`<option value="${x}" ${(Array.isArray(p.equipment)?p.equipment:[]).includes(x)?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select><small class="tiny">For no-gym plans, only bodyweight/stairs options are used.</small></div>
      <div class="field"><label>Injury or medical concern</label><textarea data-field="injuryOrMedicalConcern" rows=3 placeholder="Optional: describe a concern for a safety prompt; do not use this tool for diagnosis.">${escapeHtml(p.injuryOrMedicalConcern||'')}</textarea></div>
    </div>`;
  }
  if(step===4) return `<div class="safety-check-grid">
    <div class="card safety-check-card">
      <div class="eyebrow">SAFETY CHECK</div>
      <h3 style="margin-top:8px">Please flag anything relevant.</h3>
      <p class="muted" style="line-height:1.6;margin-top:8px">MYFIT AI is a wellness planner. These answers are used to avoid inappropriate weight-loss or exercise guidance.</p>
      <div class="field" style="margin-top:16px"><label>Pregnancy / postpartum status</label><select data-field="pregnancyStatus">
        <option value="not_applicable" ${p.pregnancyStatus==='not_applicable'?'selected':''}>Not applicable</option>
        <option value="not_pregnant" ${p.pregnancyStatus==='not_pregnant'?'selected':''}>Not pregnant</option>
        <option value="pregnant" ${p.pregnancyStatus==='pregnant'?'selected':''}>Pregnant</option>
        <option value="postpartum" ${p.pregnancyStatus==='postpartum'?'selected':''}>Postpartum</option>
      </select></div>
      <label class="check-row"><input type="checkbox" data-field="significantMedicalCondition" ${p.significantMedicalCondition?'checked':''}> <span>Significant medical condition that could affect exercise or nutrition</span></label>
      <label class="check-row"><input type="checkbox" data-field="eatingConcern" ${p.eatingConcern?'checked':''}> <span>Current or past eating-disorder concern / unsafe relationship with food</span></label>
      <div class="field" style="margin-top:14px"><label>Injury or medical concern</label><textarea data-field="injuryOrMedicalConcern" rows=3 placeholder="Optional safety note — do not use this tool for diagnosis.">${escapeHtml(p.injuryOrMedicalConcern||'')}</textarea></div>
    </div>
    <div class="notice safety">
      <strong>Professional guidance may be needed.</strong>
      <div class="tiny" style="margin-top:7px;line-height:1.6">Pregnancy/postpartum, significant medical conditions, significant injuries, or eating-disorder concerns should be reviewed with an appropriate healthcare professional before following a personalized weight-loss or training plan.</div>
    </div>
  </div>`;
  return `<div class="grid grid-2">
    <div class="field"><label>Diet style</label><select data-field="dietType"><option value="vegetarian" ${p.dietType==='vegetarian'?'selected':''}>Vegetarian</option><option value="eggetarian" ${p.dietType==='eggetarian'?'selected':''}>Eggetarian</option><option value="vegan" ${p.dietType==='vegan'?'selected':''}>Vegan</option><option value="jain" ${p.dietType==='jain'?'selected':''}>Jain-friendly</option><option value="non-vegetarian" ${p.dietType==='non-vegetarian'?'selected':''}>Non-vegetarian</option></select></div>
    <div class="field"><label>Cuisine preference</label><select data-field="cuisinePreference"><option value="mixed" ${p.cuisinePreference==='mixed'?'selected':''}>Mixed Indian</option><option value="north-indian" ${p.cuisinePreference==='north-indian'?'selected':''}>North Indian</option><option value="south-indian" ${p.cuisinePreference==='south-indian'?'selected':''}>South Indian</option><option value="west-indian" ${p.cuisinePreference==='west-indian'?'selected':''}>West Indian</option></select></div>
    <div class="field"><label>Meals per day</label><select data-field="mealsPerDay"><option value="2" ${Number(p.mealsPerDay)===2?'selected':''}>2</option><option value="3" ${Number(p.mealsPerDay)===3?'selected':''}>3</option><option value="4" ${Number(p.mealsPerDay)===4?'selected':''}>4</option><option value="5" ${Number(p.mealsPerDay)===5?'selected':''}>5</option><option value="6" ${Number(p.mealsPerDay)===6?'selected':''}>6</option></select></div>
    <div class="field"><label>Cooking availability</label><select data-field="cookingAvailability"><option value="limited" ${p.cookingAvailability==='limited'?'selected':''}>Limited — quick meals</option><option value="moderate" ${p.cookingAvailability==='moderate'?'selected':''}>Moderate</option><option value="high" ${p.cookingAvailability==='high'?'selected':''}>I can cook</option></select></div>
    <div class="field"><label>Budget</label><select data-field="budget"><option value="low" ${p.budget==='low'?'selected':''}>Budget-conscious</option><option value="medium" ${p.budget==='medium'?'selected':''}>Moderate</option><option value="flexible" ${p.budget==='flexible'?'selected':''}>Flexible</option></select></div>
    <div class="field"><label>Eating out</label><select data-field="eatingOutFrequency"><option value="rarely" ${p.eatingOutFrequency==='rarely'?'selected':''}>Rarely</option><option value="sometimes" ${p.eatingOutFrequency==='sometimes'?'selected':''}>Sometimes</option><option value="often" ${p.eatingOutFrequency==='often'?'selected':''}>Often</option></select></div>
    <div class="field"><label>Workout timing</label><select data-field="workoutTiming"><option value="pre" ${p.workoutTiming==='pre'?'selected':''}>Before a main meal</option><option value="post" ${p.workoutTiming==='post'?'selected':''}>After a main meal</option><option value="flexible" ${p.workoutTiming==='flexible'?'selected':''}>Flexible</option></select></div>
    <div class="field"><label>Allergies</label><input data-field="allergies" value="${escapeHtml(p.allergies)}" placeholder="e.g. peanuts, dairy"><small class="tiny">Separate multiple allergies with commas.</small></div>
    <div class="field"><label>Foods you dislike</label><input data-field="dislikedFoods" value="${escapeHtml(p.dislikedFoods)}" placeholder="e.g. paneer, fish"><small class="tiny">Separate multiple foods with commas.</small></div>
    <div class="field"><label>Typical daily steps</label><input data-field="dailySteps" type="number" min="0" max="50000" value="${escapeHtml(p.dailySteps)}" placeholder="e.g. 7000"></div>
    <div class="field"><label>Sleep (hours)</label><input data-field="sleepHours" type="number" min="3" max="14" step="0.5" value="${escapeHtml(p.sleepHours)}"></div>
    <div class="field"><label>Stress level</label><select data-field="stressLevel"><option value="low" ${p.stressLevel==='low'?'selected':''}>Low</option><option value="moderate" ${p.stressLevel==='moderate'?'selected':''}>Moderate</option><option value="high" ${p.stressLevel==='high'?'selected':''}>High</option></select></div>
  </div>`;

}

function safetyAssessment(){
  const p=state.profile||{};
  const flags=[];
  if(p.pregnancyStatus==='pregnant') flags.push('pregnancy');
  if(p.pregnancyStatus==='postpartum') flags.push('postpartum');
  if(p.significantMedicalCondition) flags.push('medical');
  if(p.eatingConcern) flags.push('eating');
  if(String(p.injuryOrMedicalConcern||'').trim()) flags.push('injury');
  if(state.metrics?.reality?.tone==='danger') flags.push('extreme_timeline');
  return {flags, blocked:flags.some(x=>['pregnancy','postpartum','medical','eating'].includes(x))};
}
function safetyMessage(){
  const s=safetyAssessment();
  if(!s.flags.length) return '';
  if(s.blocked) return 'Personalized weight-loss or exercise recommendations are limited because you flagged a safety concern. Please seek appropriate professional guidance before making significant changes.';
  if(s.flags.includes('extreme_timeline')) return 'Your requested timeline is unusually aggressive. MYFIT AI will not encourage extreme restriction or guarantee a result; consider extending the timeline and seek professional guidance where appropriate.';
  if(s.flags.includes('injury')) return 'You reported an injury or medical concern. Get appropriate professional guidance before starting or modifying exercise.';
  return '';
}
function renderReality(){
  const m=state.metrics; const p=state.profile; const reality=m.reality;
  const gap=Math.abs(Number(p.targetWeightKg)-Number(p.weightKg));
  const percent=Math.min(100,Math.max(0,(reality.rate||0)/1.2*100));
  return `<section class="fade-up">
    <div class="section-head"><div><div class="eyebrow">Reality check</div><h2 style="margin-top:7px;">Your target, honestly assessed.</h2></div><span class="pill ${reality.tone==='warn'?'warn':reality.tone==='danger'?'danger':''}">${escapeHtml(reality.status)}</span></div>
    <div class="reality">
      <div class="card reality-scale">
        <div class="tiny">Requested change</div>
        <div style="font-size:44px;font-weight:800;margin-top:6px">${escapeHtml(p.weightKg)} → ${escapeHtml(p.targetWeightKg)} kg</div>
        <div class="muted" style="margin-top:6px">${gap.toFixed(1)} kg target gap · ${reality.weeks || '—'} weeks</div>
        <div class="scale-track"><span class="scale-marker" style="left:${percent}%"></span></div>
        <div class="scale-labels"><span>Conservative</span><span>Recommended</span><span>Ambitious</span><span>Very aggressive</span></div>
      </div>
      <div class="alert-box">
        <div class="tiny">MYFIT AI assessment</div>
        <h3 style="margin-top:7px">${escapeHtml(reality.status)}</h3>
        <p class="muted" style="line-height:1.65">${escapeHtml(reality.message)}</p>
        <div class="notice safety"><strong>BMI: ${m.bmi}</strong><div class="tiny" style="margin-top:6px">${escapeHtml(m.bmiCategory)}. BMI is a screening measure, not a diagnosis.</div></div>
        ${safetyMessage()?`<div class="notice danger" style="margin-top:10px"><strong>Safety guidance</strong><div class="tiny" style="margin-top:6px">${escapeHtml(safetyMessage())}</div></div>`:''}
      </div>
    </div>
    <div class="hero-actions" style="justify-content:flex-end"><button class="btn btn-primary" data-action="generate">Build my personalized plan →</button></div>
  </section>`;
}

function renderLoading(){
  return `<section class="loading fade-up"><div class="loading-orb"></div><div class="eyebrow">MYFIT AI ENGINE</div><h2 style="margin-top:8px">Building your plan.</h2><p class="muted">No external AI API. Structured local logic is matching your goals, lifestyle and preferences.</p><div class="checklist"><div class="checklist-row done"><span>Understanding your profile</span><b>✓</b></div><div class="checklist-row done"><span>Checking your target</span><b>✓</b></div><div class="checklist-row done"><span>Matching nutrition options</span><b>✓</b></div><div class="checklist-row"><span>Building your weekly roadmap</span><b>…</b></div></div></section>`;
}

function journeyProgress(){
  const weeks=Number(state.metrics?.reality?.weeks||8); const entries=state.progress.weightEntries||[];
  const current=Number(state.profile.weightKg||0), target=Number(state.profile.targetWeightKg||0);
  if(!current || !target || current===target) return 0;
  const latest=entries.length ? Number(entries[entries.length-1].weight) : current;
  const total=Math.abs(current-target), done=Math.max(0, total-Math.abs(latest-target));
  return Math.max(0,Math.min(100,Math.round((done/total)*100)));
}
function realityClass(){ const t=state.metrics?.reality?.tone; return t==='danger'?'danger':t==='warn'?'warn':'success'; }
function realityLabel(){ const t=state.metrics?.reality?.tone; return t==='danger'?'TIMELINE REQUIRES RECONSIDERATION':t==='warn'?'NEEDS ADJUSTMENT':'REALISTIC'; }
function renderMiniLineChart(entries){
  if(!entries.length) return `<div class="chart-empty"><div class="chart-empty-icon">↗</div><strong>Your trend starts here.</strong><span>Log your weight periodically to reveal your local progress curve.</span></div>`;
  const pts=entries.slice(-8), vals=pts.map(x=>Number(x.weight)); const min=Math.min(...vals), max=Math.max(...vals), range=Math.max(0.1,max-min);
  const points=pts.map((e,i)=>`${8 + (i*(84/(Math.max(pts.length-1,1)))).toFixed(1)},${(86-((Number(e.weight)-min)/range)*66).toFixed(1)}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Weight trend chart"><defs><linearGradient id="chartGrad" x1="0" x2="1"><stop offset="0%"/><stop offset="100%"/></linearGradient></defs><polyline points="${points}" fill="none" stroke="url(#chartGrad)" stroke-width="2.8" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,86 92,86" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
}
function renderJourneyRoadmap(){
  const roadmap=state.plan?.roadmap||[]; const currentWeek=Math.min(roadmap.length,Math.max(1,Math.ceil((journeyProgress()/100)*roadmap.length)||1));
  return `<div class="roadmap-track">${roadmap.map((w,i)=>`<button class="roadmap-node ${i+1<currentWeek?'done':''} ${i+1===currentWeek?'current':''}" data-action="roadmap-week" data-week="${w.week}"><span>${i+1<currentWeek?'✓':w.week}</span><small>Week ${w.week}</small></button>`).join('')}</div>`;
}
function renderDashboard(){
  const p=state.profile, m=state.metrics, plan=state.plan; if(!m||!plan) return renderEmpty('Your plan has not been generated yet.','questionnaire');
  const current=Number(p.weightKg||0), target=Number(p.targetWeightKg||0), gap=Math.abs(current-target), jp=journeyProgress(), realityTone=realityClass();
  const habits=[
    {icon:'◷', title:'Sleep', value:`${Number(p.sleepHours||7)}h target`, detail:'Protect recovery'},
    {icon:'◌', title:'Movement', value:`${p.dailySteps?Number(p.dailySteps).toLocaleString():'7,000'}+ steps`, detail:'Build daily activity'},
    {icon:'◒', title:'Workout', value:`${p.workoutDays} sessions`, detail:'Consistency first'},
    {icon:'◔', title:'Nutrition', value:`${p.mealsPerDay} meals/day`, detail:'Follow your meal rhythm'}
  ];
  const firstMeal=plan.nutrition.meals?.[0], nextSession=plan.workout.sessions?.[0];
  return `<section class="dashboard-page fade-up">
    <div class="dashboard-hero-band">
      <div class="dashboard-greeting"><div class="eyebrow">MY JOURNEY</div><h2>${escapeHtml(p.name||'Your')}, this is your plan in motion.</h2><p class="muted">A live snapshot of the habits, movement and nutrition choices that move you toward your target.</p><div class="journey-meta"><span class="status-dot ${realityTone}"></span><strong>${escapeHtml(realityLabel())}</strong><span>·</span><span>${escapeHtml(p.goal==='muscle'?'Muscle + fitness':p.goal==='fatloss'?'Fat loss':'General fitness')}</span><span>·</span><span>${m.reality.weeks||'—'} weeks</span></div></div>
      <div class="journey-ring" style="--progress:${jp}%"><div><strong>${jp}%</strong><span>journey</span></div></div>
    </div>

    <div class="dashboard-toolbar"><div class="toolbar-left"><span class="pill ${p.isDemo?'demo-pill':''}">${p.isDemo?'FICTIONAL DEMO MODE':'PERSONAL PLAN'}</span><span class="tiny">Updated locally in this browser</span></div><div class="toolbar-actions"><button class="btn btn-secondary btn-sm" data-action="themes">Theme</button><button class="btn btn-primary btn-sm" data-action="presentation">Presentation Mode</button><button class="btn btn-secondary btn-sm" data-action="report">Download My Plan</button></div></div>

    <div class="hero-metric-grid">
      <article class="metric-hero"><div class="tiny">CURRENT</div><strong>${current.toFixed(1)} <span>kg</span></strong><span>Today’s baseline</span></article>
      <article class="metric-hero target"><div class="tiny">TARGET</div><strong>${target.toFixed(1)} <span>kg</span></strong><span>${gap.toFixed(1)} kg to go</span></article>
      <article class="metric-hero"><div class="tiny">BMI</div><strong>${m.bmi}</strong><span>${escapeHtml(m.bmiCategory)}</span></article>
      <article class="metric-hero reality-${realityTone}"><div class="tiny">REALITY STATUS</div><strong>${escapeHtml(realityLabel())}</strong><span>${escapeHtml(m.reality.message.split('. ')[0])}</span></article>
    </div>

    <div class="dashboard-grid-main">
      <article class="showcase-card reality-card ${realityTone}">
        <div class="card-kicker"><span>REALITY CHECK</span><span class="signal ${realityTone}"></span></div>
        <div class="reality-main"><div><div class="reality-status">${realityTone==='success'?'🟢':realityTone==='warn'?'🟡':'🔴'} ${escapeHtml(realityLabel())}</div><p>${escapeHtml(m.reality.message)}</p></div><div class="pace-badge"><strong>${m.reality.rate ?? '—'}</strong><span>kg / week</span></div></div>
        <div class="reality-bar"><span style="width:${Math.min(100,Math.max(10, Number(m.reality.rate||0)/1.2*100))}%"></span></div>
        <div class="tiny reality-note">Planning guidance only — not a medical prediction.</div>
      </article>
      <article class="showcase-card progress-card">
        <div class="card-kicker"><span>PROGRESS</span><button class="link-btn" data-action="progress">Open tracker →</button></div>
        <div class="chart-head"><div><strong>Weight trend</strong><span>${(state.progress.weightEntries||[]).length} entries</span></div><span class="chart-legend">LOCAL DATA</span></div>
        <div class="sparkline-wrap">${renderMiniLineChart(state.progress.weightEntries||[])}</div>
      </article>
    </div>

    <div class="section-title-row"><div><div class="eyebrow">TODAY</div><h3>Small actions. Visible momentum.</h3></div><button class="link-btn" data-action="plan">View full plan →</button></div>
    <div class="today-wow-grid">
      <article class="today-card meal"><div class="today-icon">🍽</div><span class="tiny">NUTRITION</span><strong>${escapeHtml(firstMeal?.item?.name||'Personalized meal')}</strong><p>${escapeHtml(firstMeal?.portion||'Use your planned portion and meal rhythm.')}</p><button class="text-btn" data-action="plan">See meals</button></article>
      <article class="today-card workout"><div class="today-icon">✦</div><span class="tiny">WORKOUT</span><strong>${escapeHtml(nextSession?.focus||'Movement session')}</strong><p>${nextSession?.duration||p.workoutMinutes} min · ${p.gymAccess?'Gym':'No gym'} · ${escapeHtml(p.trainingExperience)}</p><button class="text-btn" data-action="plan">See workout</button></article>
      <article class="today-card habit"><div class="today-icon">◎</div><span class="tiny">HABIT STACK</span><strong>${habits[0].value}</strong><p>${habits[0].detail} · keep the smallest promise today.</p><button class="text-btn" data-action="log-habit">Log habit</button></article>
    </div>

    <div class="section-title-row"><div><div class="eyebrow">WEEKLY ROADMAP</div><h3>Your next milestones</h3></div><span class="tiny">${plan.roadmap?.length||0} weeks planned</span></div>
    <article class="showcase-card roadmap-card"><div class="roadmap-header"><div><strong>From today to target</strong><span>Tap a week to focus your next milestone.</span></div><div class="roadmap-glow"></div></div>${renderJourneyRoadmap()}<div class="roadmap-current"><div class="tiny">FOCUS NEXT</div><strong>${escapeHtml(plan.roadmap?.[0]?.title||'Start strong')}</strong><p>${escapeHtml(plan.roadmap?.[0]?.highlight||'Build a consistent base this week.')}</p></div></article>

    <div class="section-title-row"><div><div class="eyebrow">KEY HABITS</div><h3>Only what matters most</h3></div><button class="btn btn-secondary btn-sm" data-action="progress">Track progress</button></div>
    <div class="habit-grid">${habits.slice(0,4).map(h=>`<article class="habit-card"><span class="habit-icon">${h.icon}</span><div><strong>${escapeHtml(h.title)}</strong><span>${escapeHtml(h.value)}</span><small>${escapeHtml(h.detail)}</small></div></article>`).join('')}</div>

    <article class="photo-panel ${state.photoData?'has-photo':''}">${state.photoData?`<img src="${state.photoData}" alt="Your optional profile photo">`:`<div class="photo-placeholder"><span>✦</span><strong>Your journey, your visual.</strong><p>Optional photo personalization. No image analysis, BMI inference or body measurements.</p></div>`}<div class="photo-copy"><div class="eyebrow">VISUAL PERSONALIZATION</div><h3>${state.photoData?'Your photo is stored locally.':'Add a personal touch.'}</h3><p>${state.photoData?'Only the image preview is used by the app.':'Use a photo for your own visual journey — never for health or body analysis.'}</p><div class="photo-actions"><button class="btn btn-secondary btn-sm" data-action="upload-photo">${state.photoData?'Change photo':'Add photo'}</button>${state.photoData?'<button class="link-btn" data-action="remove-photo">Delete photo</button>':''}</div></div></article>

    ${safetyMessage()?`<div class="safety-banner danger"><strong>Safety guidance</strong><span>${escapeHtml(safetyMessage())}</span><button class="link-btn" data-action="privacy">Privacy & safety →</button></div>`:''}
    <div class="safety-banner"><strong>Wellness tool, not medical advice.</strong><span>MYFIT AI provides general wellness planning and does not diagnose conditions, prescribe treatment or analyze photos for body/medical measurements.</span><button class="link-btn" data-action="privacy">Privacy & safety →</button></div>
  </section>`;
}

function renderPlan(){
  const p=state.profile, plan=state.plan; if(!plan) return renderEmpty('Generate your personalized plan first.','questionnaire');
  return `<section class="fade-up"><div class="section-head"><div><div class="eyebrow">Personalized plan</div><h2 style="margin-top:6px">Built for your routine.</h2></div><span class="pill">${p.gymAccess?'GYM':'NO GYM'} · ${p.workoutDays} DAYS</span></div>
    <div class="nav-tabs"><button class="tab active">Nutrition</button><button class="tab">Workout</button><button class="tab">Roadmap</button></div>
    <div class="grid grid-2"><div class="card"><div class="section-head"><div><div class="tiny">NUTRITION</div><h3 style="margin-top:6px">Actionable Indian meal plan</h3></div><span class="pill">${plan.nutrition.calorieTarget || 'Flexible'} ${plan.nutrition.calorieTarget?'kcal planning target':''}</span></div><p class="muted" style="line-height:1.6">${escapeHtml(plan.nutrition.principle)}</p>${plan.nutrition.warnings?.map(w=>`<div class="notice" style="margin-top:10px">${escapeHtml(w)}</div>`).join('')||''}<div class="list" style="margin-top:12px">${plan.nutrition.meals.map(m=>`<div class="list-item"><strong>${escapeHtml(m.slot)} · ${escapeHtml(m.item.name)}</strong><small>${escapeHtml(m.portion)}</small>${m.alternatives?.length?`<small>Alternatives: ${m.alternatives.map(a=>escapeHtml(a.name)).join(' · ')}</small>`:''}</div>`).join('')}</div><div class="footer-note">Filters applied: ${escapeHtml(plan.nutrition.filtersApplied.dietType)} · ${escapeHtml(plan.nutrition.filtersApplied.cuisinePreference)} · ${plan.nutrition.filtersApplied.mealsPerDay} meals/day</div></div>
    <div class="card"><div class="section-head"><div><div class="tiny">FITNESS</div><h3 style="margin-top:6px">Your adaptive training plan</h3></div><span class="pill">${plan.workout.days} × ${plan.workout.duration} min</span></div><div class="notice" style="margin-bottom:12px"><strong>${escapeHtml(plan.workout.trainingSplit)}</strong><div class="tiny" style="margin-top:6px">${plan.workout.mode==='gym'?'Gym-based':'No-gym'} · ${escapeHtml(plan.workout.level)} · ${escapeHtml(plan.workout.goal)}</div></div>${plan.workout.warnings?.map(w=>`<div class="notice" style="margin-bottom:10px">${escapeHtml(w)}</div>`).join('')||''}<div class="list">${plan.workout.sessions.map(sess=>`<div class="list-item"><strong>${escapeHtml(sess.day)} · ${escapeHtml(sess.focus)} · ${sess.duration} min</strong><small>Warm-up ${sess.warmup.minutes} min · ${sess.exercises.map(e=>escapeHtml(e.name)).join(' · ')} · Cool-down ${sess.cooldown.minutes} min</small><small>${sess.exercises.map(e=>`${escapeHtml(e.name)}: ${e.prescription.sets} × ${escapeHtml(e.prescription.reps)}${e.prescription.restSec?` · ${e.prescription.restSec}s rest`:''}${e.alternatives?.length?` · Alt: ${e.alternatives.map(escapeHtml).join(', ')}`:''}`).join(' | ')}</small></div>`).join('')}</div></div></div>
    <div class="card" style="margin-top:16px"><div class="section-head"><div><div class="tiny">WEEKLY ROADMAP</div><h3 style="margin-top:6px">Your next milestones</h3></div></div><div class="list">${plan.roadmap.slice(0,8).map((w,i)=>`<div class="list-item"><strong>Week ${w.week} · ${escapeHtml(w.title)}</strong><small>${escapeHtml(w.target)} — ${escapeHtml(w.highlight)}</small></div>`).join('')}</div></div>
  </section>`;
}

function renderProgressScreen(){
  const p=state.profile; const entries=state.progress.weightEntries||[]; const current=Number(p.weightKg||0); const target=Number(p.targetWeightKg||0); const latest=entries.length?Number(entries[entries.length-1].weight):current; const delta=current-latest;
  const max=Math.max(current,target,...entries.map(e=>Number(e.weight))); const min=Math.min(current,target,...entries.map(e=>Number(e.weight))); const range=Math.max(1,max-min);
  return `<section class="fade-up progress-page"><div class="section-head"><div><div class="eyebrow">PROGRESS STUDIO</div><h2 style="margin-top:6px">Measure momentum, not perfection.</h2><p class="muted">Your entries stay local to this browser.</p></div><button class="btn btn-primary" data-action="log-weight">＋ Log weight</button></div>
    <div class="grid grid-3 progress-kpis"><article class="metric-hero"><div class="tiny">LATEST</div><strong>${latest?latest.toFixed(1):'—'} <span>kg</span></strong><span>${delta>=0?`↓ ${delta.toFixed(1)} kg from start`:`↑ ${Math.abs(delta).toFixed(1)} kg from start`}</span></article><article class="metric-hero"><div class="tiny">WORKOUTS</div><strong>${state.progress.workoutsCompleted}</strong><span>logged this plan</span><button class="text-btn" data-action="log-workout">Log workout</button></article><article class="metric-hero"><div class="tiny">HABITS</div><strong>${state.progress.habitsCompleted}</strong><span>habit check-ins</span><button class="text-btn" data-action="log-habit">Log habit</button></article></div>
    <article class="showcase-card large-chart-card"><div class="card-kicker"><span>WEIGHT TREND</span><span class="chart-legend">${entries.length} entries</span></div>${entries.length?`<div class="big-chart"><div class="y-labels"><span>${max.toFixed(0)}</span><span>${((max+min)/2).toFixed(0)}</span><span>${min.toFixed(0)}</span></div><div class="big-chart-area"><div class="target-line" style="bottom:${((target-min)/range)*100}%"><span>Target ${target.toFixed(1)} kg</span></div><svg class="sparkline large" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="bigGrad" x1="0" x2="1"><stop offset="0%"/><stop offset="100%"/></linearGradient></defs><polyline points="${entries.slice(-14).map((e,i)=>`${4+(i*(92/(Math.max(entries.slice(-14).length-1,1)))},${94-((Number(e.weight)-min)/range)*82}`).join(' ')}" fill="none" stroke="url(#bigGrad)" stroke-width="2.7" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div><div class="chart-axis">${entries.slice(-7).map(e=>`<span>${escapeHtml(e.date.slice(5))}</span>`).join('')}</div>`:`<div class="chart-empty large"><div class="chart-empty-icon">↗</div><strong>Start your trend</strong><span>Log your current weight. The dashboard will turn your local entries into a visual journey.</span><button class="btn btn-secondary btn-sm" data-action="log-weight">Add first entry</button></div>`}</article>
    <div class="section-title-row"><div><div class="eyebrow">CONSISTENCY</div><h3>Build the boring wins.</h3></div></div><div class="habit-grid">${['Workout','Sleep','Movement','Nutrition'].map((x,i)=>`<article class="habit-card"><span class="habit-index">0${i+1}</span><div><strong>${x}</strong><span>${i===0?state.progress.workoutsCompleted:`${Math.min(7,state.progress.habitsCompleted+i)} check-ins`} logged</span><small>${['Show up for planned movement.','Protect your recovery window.','Keep everyday activity moving.','Follow the meal structure.'][i]}</small></div></article>`).join('')}</div>
  </section>`;
}

function renderPrivacy(){
  return `<section class="fade-up"><div class="section-head"><div><div class="eyebrow">Privacy center</div><h2 style="margin-top:6px">You control your data.</h2><p class="muted">The core app is designed to run client-side without a paid AI API.</p></div></div>
  <div class="grid grid-2"><div class="card"><div class="list"><div class="list-item"><strong>✓ Browser-local storage</strong><small>The app stores profile, plan and progress in this browser's local storage. The app does not transmit this data to a MYFIT AI server; browser/OS backup or extension behavior is outside the app's control.</small></div><div class="list-item"><strong>✓ No fake AI calls</strong><small>The planner uses structured local rules and data in this core build.</small></div><div class="list-item"><strong>✓ Optional photo is visual-only</strong><small>The selected image is stored as browser data for display and is not analyzed for BMI, body fat, obesity or medical conditions.</small></div></div></div>
  <div class="card"><h3>Data controls</h3><button class="btn btn-primary" style="width:100%;margin-top:16px" data-action="report">Download My Plan</button><button class="btn btn-secondary" style="width:100%;margin-top:10px" data-action="export">Export local data</button><button class="btn btn-danger" style="width:100%;margin-top:10px" data-action="reset">Delete My Data</button><div class="footer-note">Clearing data is permanent for this browser storage. Use export first if you want a copy.</div></div></div>
  <div class="card safety" style="margin-top:16px"><h3>Safety & disclaimer</h3><p class="muted" style="line-height:1.7">MYFIT AI provides general wellness and fitness planning. It is not a medical diagnosis or treatment tool, does not replace a doctor or registered dietitian, and does not infer BMI, body fat, obesity or medical conditions from photographs. Estimates such as BMI, BMR, TDEE and timeline pacing are planning aids and may not reflect an individual’s actual needs.</p></div></section>`;
}

function renderPresentation(){
  const p=state.profile,m=state.metrics,plan=state.plan;
  if(!m||!plan) return renderEmpty('Create your plan before entering presentation mode.','questionnaire');
  const slide=Number(state.presentationSlide||0);
  const safeSlide=Math.min(PRESENTATION_STEPS.length-1,Math.max(0,slide));
  const playing=!!state.presentationPlaying;
  return `<section class="presentation-stage" tabindex="0" data-presentation-root>
    <div class="presentation-topline"><span class="eyebrow">MYFIT AI · PRESENTATION MODE</span><div class="presentation-top-actions"><span class="presentation-counter">${safeSlide+1} / ${PRESENTATION_STEPS.length}</span><button class="btn btn-secondary btn-sm" data-action="presentation-exit">Exit</button></div></div>
    <div class="presentation-progress"><span style="width:${((safeSlide+1)/PRESENTATION_STEPS.length)*100}%"></span></div>
    <div class="presentation-slide-shell" data-slide-index="${safeSlide}">${presentationSlideHtml(safeSlide,state,{journeyProgress,realityLabel,realityClass})}</div>
    <div class="presentation-controls"><button class="btn btn-secondary" data-action="presentation-prev" ${safeSlide===0?'disabled':''}>← Previous</button><button class="btn ${playing?'btn-secondary':'btn-primary'}" data-action="presentation-play">${playing?'Ⅱ Pause':'▶ Play'}</button><button class="btn btn-secondary" data-action="presentation-next" ${safeSlide===PRESENTATION_STEPS.length-1?'disabled':''}>Next →</button></div>
    <div class="presentation-hint">Use ← / → and spacebar · Auto-play advances every 5 seconds</div>
  </section>`;
}

function renderThemes(){
  const themes=[
    {key:'premium',name:'Premium',desc:'Violet + emerald, polished and calm',swatches:['#7C5CFF','#00D9A6','#07111F']},
    {key:'cinematic',name:'Cinematic',desc:'Midnight + amber, dramatic depth',swatches:['#ff7a59','#ffcc70','#090b12']},
    {key:'retro',name:'Retro',desc:'Electric cyan + magenta, nostalgic glow',swatches:['#ff3cac','#00f5ff','#17102f']},
    {key:'future',name:'Future',desc:'Cool blue + holographic violet',swatches:['#48c6ef','#7f7fd5','#060b18']},
    {key:'energy',name:'Energy',desc:'Lime + orange, high-output mode',swatches:['#c7ff4d','#ff9a3c','#10140b']}
  ];
  return `<section class="fade-up theme-page"><div class="section-head"><div><div class="eyebrow">THEME STUDIO</div><h2 style="margin-top:6px">Change the atmosphere.</h2><p class="muted">The engine stays the same. The feeling changes.</p></div><button class="btn btn-secondary" data-action="dashboard">← Dashboard</button></div><div class="theme-grid">${themes.map(t=>`<button class="theme-card ${state.theme===t.key?'selected':''}" data-action="set-theme" data-theme="${t.key}"><div class="theme-preview theme-${t.key}" style="--sw1:${t.swatches[0]};--sw2:${t.swatches[1]};--sw3:${t.swatches[2]}"><span class="theme-glow"></span><div class="theme-mini-card"><b>${t.name}</b><span>MYFIT AI</span><i></i><i></i><i></i></div></div><div class="theme-meta"><div><strong>${t.name}</strong><span>${t.desc}</span></div><span class="theme-check">${state.theme===t.key?'✓':'○'}</span></div></button>`).join('')}</div><div class="notice safety" style="margin-top:18px"><strong>Designed for presentation mode.</strong><div class="tiny" style="margin-top:6px">All themes are original visual treatments and do not copy third-party characters or franchises.</div></div></section>`;
}

function renderEmpty(text, action){ return `<section class="empty fade-up"><h3>${escapeHtml(text)}</h3><button class="btn btn-primary" style="margin-top:18px" data-action="${action}">Start questionnaire</button></section>`; }

function updateProfileFromInput(el){
  const key=el.dataset.field; let v;
  if(key==='equipment' && el.multiple){ v=[...el.selectedOptions].map(o=>o.value); } else { v=el.value; }
  if(el.tagName==='SELECT' && key==='gymAccess') v=(v==='true');
  if(el.type==='checkbox') v=el.checked;
  if(['age','heightCm','weightKg','targetWeightKg','workoutDays','workoutMinutes','dailySteps','sleepHours','mealsPerDay'].includes(key)) v=v===''?'':Number(v);
  state.profile[key]=v; persist();
}

let eventCurrentTargetTheme='';
function bindEvents(){
  document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{ eventCurrentTargetTheme=el.dataset.theme||''; handleAction(el.dataset.action); eventCurrentTargetTheme=''; }));
  document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',()=>updateProfileFromInput(el)));
  document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('change',()=>updateProfileFromInput(el)));
  document.querySelectorAll('.option').forEach(el=>el.addEventListener('click',()=>{ state.profile.goal=el.dataset.value; persist(); render(); }));
}

function handleAction(action){
  if(action==='home'){ state.screen='landing'; render(); return; }
  if(action==='start'){ state.profile={...initial.profile,isDemo:false}; state.wizardStep=0; state.screen='questionnaire'; render(); return; }
  if(action==='demo'){ state.profile={...initial.profile,...DEMO_PROFILE}; state.screen='loading'; persist(); render(); setTimeout(()=>{ rebuildPlan(); state.screen='reality'; render(); },1500); return; }
  if(action==='prev-step'){ state.wizardStep=Math.max(0,state.wizardStep-1); render(); return; }
  if(action==='next-step'){
    if(!validateStep(state.wizardStep)) return;
    if(state.wizardStep<steps.length-1){ state.wizardStep++; render(); }
    else { rebuildPlan(); state.screen='reality'; render(); }
    return;
  }
  if(action==='generate'){ state.screen='loading'; render(); setTimeout(()=>{ rebuildPlan(); state.screen='dashboard'; render(); },1500); return; }
  if(action==='dashboard'){ setScreen('dashboard'); return; }
  if(action==='plan'){ setScreen('plan'); return; }
  if(action==='progress'){ setScreen('progress'); return; }
  if(action==='privacy'){ setScreen('privacy'); return; }
  if(action==='themes'){ setScreen('themes'); return; }
  if(action==='set-theme'){ state.theme=eventCurrentTargetTheme || state.theme; persist(); render(); return; }
  if(action==='roadmap-week'){ showToast('Milestone selected. Keep the next week simple and consistent.'); return; }
  if(action==='presentation'){ state.screen='presentation'; state.presentationSlide=0; state.presentationPlaying=false; stopPresentationTimer(); render(); setTimeout(()=>focusPresentation(),50); return; }
  if(action==='presentation-exit'){ stopPresentationTimer(); state.presentationPlaying=false; setScreen('dashboard'); return; }
  if(action==='presentation-next'){ advancePresentation(1); return; }
  if(action==='presentation-prev'){ advancePresentation(-1); return; }
  if(action==='presentation-play'){ togglePresentationPlayback(); return; }
  if(action==='report'){ openPrintableReport(state); return; }
  if(action==='upload-photo'){ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=()=>{ const f=input.files?.[0]; if(!f) return; if(f.size>2*1024*1024){ showToast('Choose a photo under 2 MB.'); return; } const reader=new FileReader(); reader.onload=()=>{ state.photoData=reader.result; persist(); render(); showToast('Photo saved locally.'); }; reader.readAsDataURL(f); }; input.click(); return; }
  if(action==='remove-photo'){ state.photoData=''; persist(); render(); showToast('Photo removed.'); return; }
  if(action==='log-workout'){ state.progress.workoutsCompleted++; persist(); showToast('Workout logged locally.'); render(); return; }
  if(action==='log-habit'){ state.progress.habitsCompleted++; persist(); showToast('Habit logged locally.'); render(); return; }
  if(action==='log-weight'){
    const value=prompt('Enter your current weight in kg:'); const w=Number(value); if(w>0){ state.profile.weightKg=w; state.progress.weightEntries.push({date:new Date().toISOString().slice(0,10),weight:w}); rebuildPlan(); showToast('Weight logged locally.'); render(); } return;
  }
  if(action==='export'){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='myfit-ai-local-data.json'; a.click(); URL.revokeObjectURL(url); showToast('Local data exported.'); return; }
  if(action==='reset'){ if(confirm('Clear all MYFIT AI data saved in this browser?')){ clearState(); state={...initial,profile:{...initial.profile},progress:{...initial.progress},theme:'premium',photoData:''}; applyTheme(); render(); showToast('Local data cleared.'); } }
}

function stopPresentationTimer(){ if(presentationTimer){ clearInterval(presentationTimer); presentationTimer=null; } }
function focusPresentation(){ document.querySelector('[data-presentation-root]')?.focus(); }
function advancePresentation(direction){
  if(state.screen!=='presentation') return;
  const next=Math.max(0,Math.min(PRESENTATION_STEPS.length-1,Number(state.presentationSlide||0)+direction));
  state.presentationSlide=next;
  if(next===PRESENTATION_STEPS.length-1 && state.presentationPlaying){ state.presentationPlaying=false; stopPresentationTimer(); }
  persist(); render(); focusPresentation();
}
function togglePresentationPlayback(){
  if(state.screen!=='presentation') return;
  if(state.presentationPlaying){ state.presentationPlaying=false; stopPresentationTimer(); render(); return; }
  if(Number(state.presentationSlide||0)>=PRESENTATION_STEPS.length-1){ state.presentationSlide=0; }
  state.presentationPlaying=true; persist(); render();
  stopPresentationTimer();
  presentationTimer=setInterval(()=>{ if(state.screen!=='presentation'){stopPresentationTimer(); return;} const n=Number(state.presentationSlide||0)+1; if(n>=PRESENTATION_STEPS.length){ state.presentationSlide=PRESENTATION_STEPS.length-1; state.presentationPlaying=false; stopPresentationTimer(); persist(); render(); } else { state.presentationSlide=n; persist(); render(); } },5000);
}

function validateStep(step){
  const p=state.profile;
  if(step===0 && (!(p.age>0)||!(p.heightCm>0)||!(p.weightKg>0))){ showToast('Please enter age, height and current weight.'); return false; }
  if(step===1 && !p.goal){ showToast('Choose a goal to continue.'); return false; }
  if(step===2 && (!(p.targetWeightKg>0)||!p.targetDate)){ showToast('Add a target weight and future target date.'); return false; }
  if(step===3 && !p.dietType){ showToast('Select a diet style.'); return false; }
  return true;
}

document.addEventListener('keydown',(event)=>{
  if(state.screen!=='presentation') return;
  if(event.key==='ArrowRight'){ event.preventDefault(); advancePresentation(1); }
  else if(event.key==='ArrowLeft'){ event.preventDefault(); advancePresentation(-1); }
  else if(event.key===' '){ event.preventDefault(); togglePresentationPlayback(); }
  else if(event.key==='Escape'){ event.preventDefault(); stopPresentationTimer(); state.presentationPlaying=false; setScreen('dashboard'); }
});

render();
