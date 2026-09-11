import { escapeHtml } from './ui.js';

export const PRESENTATION_STEPS = [
  { key:'profile', eyebrow:'01 · USER PROFILE', title:'Meet the person behind the plan.', subtitle:'A plan becomes useful when it starts with the person - not the template.' },
  { key:'situation', eyebrow:'02 · CURRENT SITUATION', title:'Start where you are.', subtitle:'Here is the baseline MYFIT AI uses to personalize the journey.' },
  { key:'goal', eyebrow:'03 · GOAL', title:'Give the journey a destination.', subtitle:'Your target shapes the nutrition, movement and weekly priorities.' },
  { key:'reality', eyebrow:'04 · REALITY CHECK', title:'Ambition meets a planning reality.', subtitle:'The engine checks the requested change against the selected timeframe - respectfully and transparently.' },
  { key:'nutrition', eyebrow:'05 · NUTRITION', title:'Food that fits your life.', subtitle:'Indian-focused meals are filtered to your diet, constraints, time and routine.' },
  { key:'workout', eyebrow:'06 · WORKOUT', title:'Movement built around your availability.', subtitle:'The same engine adapts the training structure to equipment, experience and session time.' },
  { key:'roadmap', eyebrow:'07 · WEEKLY ROADMAP', title:'Turn a big goal into small milestones.', subtitle:'Each week gets a practical focus so the journey stays actionable.' },
  { key:'habits', eyebrow:'08 · HABITS', title:'Make consistency visible.', subtitle:'The dashboard keeps the priority stack intentionally small.' },
  { key:'progress', eyebrow:'09 · PROGRESS', title:'Measure momentum, not perfection.', subtitle:'Your local progress entries become a visual story over time.' },
  { key:'final', eyebrow:'10 · YOUR NEXT CHAPTER', title:'Your plan is not a punishment.', subtitle:"It's a system you can actually live with." }
];

function goalLabel(goal){ return goal==='muscle'?'Muscle + fitness':goal==='fatloss'?'Fat loss':'General fitness'; }
function firstMeal(plan){ return plan?.nutrition?.meals?.[0]; }
function firstSession(plan){ return plan?.workout?.sessions?.[0]; }

export function presentationSlideHtml(index, state, helpers={}){
  const { journeyProgress=0, realityLabel=()=>'', realityClass=()=> 'success' } = helpers;
  const p=state.profile, m=state.metrics, plan=state.plan, step=PRESENTATION_STEPS[index];
  const jp=journeyProgress();
  const tone=realityClass();
  const meal=firstMeal(plan), session=firstSession(plan);
  const road=plan?.roadmap?.slice(0,6)||[];
  const entries=state.progress?.weightEntries||[];
  const current=Number(p.weightKg||0), target=Number(p.targetWeightKg||0);

  if(step.key==='profile') return `<div class="presentation-slide visual-profile"><div class="slide-kicker">${step.eyebrow}</div><div class="profile-stage"><div class="profile-avatar">${p.name?escapeHtml(p.name.charAt(0).toUpperCase()):'M'}</div><div><div class="micro-label">FICTIONAL DEMO / LOCAL PROFILE</div><h1>${escapeHtml(p.name||'Your journey')}</h1><p>${escapeHtml(p.age||'—')} years · ${escapeHtml(p.sex||'—')} · ${escapeHtml(p.dietType||'—')}</p></div></div><div class="profile-ribbons"><span>${goalLabel(p.goal)}</span><span>${p.gymAccess?'Gym access':'No gym'}</span><span>${p.workoutDays} days/week</span><span>${p.workoutMinutes} min/session</span></div></div>`;

  if(step.key==='situation') return `<div class="presentation-slide"><div class="slide-kicker">${step.eyebrow}</div><h1>${current.toFixed(1)} <small>kg</small></h1><p>${step.subtitle}</p><div class="slide-metrics"><div><span>HEIGHT</span><strong>${p.heightCm} cm</strong></div><div><span>BMI</span><strong>${m.bmi}</strong></div><div><span>ACTIVITY</span><strong>${escapeHtml(p.activityLevel)}</strong></div><div><span>SLEEP</span><strong>${p.sleepHours}h</strong></div></div><div class="slide-callout">${escapeHtml(m.bmiCategory)} · BMI is a screening measure, not a diagnosis.</div></div>`;

  if(step.key==='goal') return `<div class="presentation-slide goal-slide"><div class="slide-kicker">${step.eyebrow}</div><div class="goal-word">${escapeHtml(goalLabel(p.goal)).toUpperCase()}</div><div class="goal-arrow">${current.toFixed(1)} <span>→</span> ${target.toFixed(1)} <small>kg</small></div><div class="goal-meta"><span>${m.reality.weeks||'—'} weeks</span><span>${Math.abs(current-target).toFixed(1)} kg change</span><span>${p.mealsPerDay} meals/day</span></div></div>`;

  if(step.key==='reality') return `<div class="presentation-slide reality-slide ${tone}"><div class="slide-kicker">${step.eyebrow}</div><div class="reality-orbit"><span class="reality-dot"></span><strong>${realityLabel()}</strong></div><div class="reality-rate">${m.reality.rate ?? '—'} <small>kg/week</small></div><p>${escapeHtml(m.reality.message)}</p><div class="reality-foot">Planning guidance only · not a medical prediction</div></div>`;

  if(step.key==='nutrition') return `<div class="presentation-slide"><div class="slide-kicker">${step.eyebrow}</div><div class="split-slide"><div><h1>Eat like a real person.</h1><p>${escapeHtml(plan?.nutrition?.principle||'A practical Indian meal structure built around your preferences.')}</p></div><div class="slide-meal-card"><span class="micro-label">${escapeHtml(meal?.slot||'MEAL')}</span><strong>${escapeHtml(meal?.item?.name||'Personalized meal')}</strong><span>${escapeHtml(meal?.portion||'Practical portion')}</span><em>${meal?.alternatives?.length||0} swap options</em></div></div></div>`;

  if(step.key==='workout') return `<div class="presentation-slide"><div class="slide-kicker">${step.eyebrow}</div><div class="split-slide"><div><h1>${escapeHtml(session?.focus||'Your workout')}</h1><p>${session?.duration||p.workoutMinutes} minutes · ${p.gymAccess?'Gym-based':'No gym'} · ${escapeHtml(p.trainingExperience||'beginner')}</p><div class="workout-ladder"><span>Warm-up ${session?.warmup?.minutes||5}m</span><span>${session?.exercises?.length||0} key movements</span><span>Cool-down ${session?.cooldown?.minutes||5}m</span></div></div><div class="exercise-stack">${(session?.exercises||[]).slice(0,4).map((e,i)=>`<div><b>0${i+1}</b><span>${escapeHtml(e.name)}</span><em>${e.prescription?.sets||'—'} × ${escapeHtml(e.prescription?.reps||'—')}</em></div>`).join('')}</div></div></div>`;

  if(step.key==='roadmap') return `<div class="presentation-slide roadmap-slide"><div class="slide-kicker">${step.eyebrow}</div><h1>Your next milestones.</h1><div class="slide-roadmap">${road.map((w,i)=>`<div class="slide-road-node ${i===0?'focus':''}"><b>${String(w.week).padStart(2,'0')}</b><span>WEEK ${w.week}</span><strong>${escapeHtml(w.title)}</strong><small>${escapeHtml(w.highlight)}</small></div>`).join('')}</div></div>`;

  if(step.key==='habits') return `<div class="presentation-slide habits-slide"><div class="slide-kicker">${step.eyebrow}</div><h1>Keep the promise small.</h1><div class="habit-presentation-grid">${[
    ['01','Sleep',`${p.sleepHours}h target`],['02','Movement',`${p.dailySteps?Number(p.dailySteps).toLocaleString():'7,000'}+ steps`],['03','Workout',`${p.workoutDays} sessions/week`],['04','Nutrition',`${p.mealsPerDay} meals/day`]
  ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('')}</div></div>`;

  if(step.key==='progress') return `<div class="presentation-slide progress-slide"><div class="slide-kicker">${step.eyebrow}</div><div class="progress-hero" style="--jp:${jp}"><strong>${jp}%</strong><span>journey progress</span></div><div class="slide-progress-stats"><div><b>${entries.length}</b><span>weight entries</span></div><div><b>${state.progress?.workoutsCompleted||0}</b><span>workouts logged</span></div><div><b>${state.progress?.habitsCompleted||0}</b><span>habit check-ins</span></div></div><p>${entries.length?'Your locally stored entries are becoming a trendline.':'Start logging locally and MYFIT AI will turn the entries into a visual trend.'}</p></div>`;

  return `<div class="presentation-slide final-slide"><div class="final-glow"></div><div class="slide-kicker">${step.eyebrow}</div><div class="final-quote">YOUR PLAN IS NOT A PUNISHMENT.</div><div class="final-quote accent">IT'S A SYSTEM YOU CAN ACTUALLY LIVE WITH.</div><div class="final-footer">MYFIT AI · Built around you.</div></div>`;
}
