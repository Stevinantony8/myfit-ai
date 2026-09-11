import { escapeHtml } from './ui.js';

function goalLabel(goal){ return goal==='muscle'?'Muscle + fitness':goal==='fatloss'?'Fat loss':'General fitness'; }
function realityLabel(reality){ return reality?.tone==='danger'?'TIMELINE REQUIRES RECONSIDERATION':reality?.tone==='warn'?'NEEDS ADJUSTMENT':'REALISTIC'; }

function mealRows(plan){
  return (plan?.nutrition?.meals||[]).map(m=>`<tr><td>${escapeHtml(m.slot)}</td><td><strong>${escapeHtml(m.item?.name||'')}</strong><br><span>${escapeHtml(m.portion||'')}</span></td><td>${(m.alternatives||[]).map(a=>escapeHtml(a.name)).join(' · ')||'—'}</td></tr>`).join('');
}
function workoutRows(plan){
  return (plan?.workout?.sessions||[]).map(s=>`<tr><td>${escapeHtml(s.day)}</td><td><strong>${escapeHtml(s.focus)}</strong><br><span>${s.duration} min · ${escapeHtml(plan.workout.mode||'')}</span></td><td>${(s.exercises||[]).map(e=>`${escapeHtml(e.name)} (${e.prescription?.sets||'—'} × ${escapeHtml(e.prescription?.reps||'—')})`).join('<br>')}</td></tr>`).join('');
}
function roadmapRows(plan){
  return (plan?.roadmap||[]).map(w=>`<tr><td>Week ${w.week}</td><td><strong>${escapeHtml(w.title)}</strong></td><td>${escapeHtml(w.target||'')}</td><td>${escapeHtml(w.highlight||'')}</td></tr>`).join('');
}

export function buildReportHtml(state){
  const p=state.profile,m=state.metrics,plan=state.plan;
  const entries=state.progress?.weightEntries||[];
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYFIT AI - Personal Wellness Plan</title><style>
  @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#142033;background:#fff;margin:0;line-height:1.45}h1,h2,h3{margin:0 0 8px}h1{font-size:34px;letter-spacing:-.03em}h2{font-size:21px;color:#101a2c;margin-top:24px}h3{font-size:14px;text-transform:uppercase;letter-spacing:.12em;color:#5f6b7b}.cover{padding:34px;border-radius:24px;background:linear-gradient(135deg,#eef0ff,#effbf7);margin-bottom:22px}.brand{font-weight:800;letter-spacing:.12em;color:#5c44db;font-size:12px}.subtitle{color:#556174}.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:18px}.meta{padding:12px;border:1px solid #dfe4ec;border-radius:14px;background:#fff}.meta span{display:block;font-size:9px;text-transform:uppercase;color:#7b8797}.meta strong{display:block;margin-top:4px;font-size:16px}.card{border:1px solid #dfe4ec;border-radius:16px;padding:16px;margin:10px 0;break-inside:avoid}.status{display:inline-block;padding:6px 9px;border-radius:999px;background:#eef2ff;font-weight:800;font-size:10px;letter-spacing:.08em}.status.success{background:#e9fbf4;color:#087653}.status.warn{background:#fff6db;color:#8a6200}.status.danger{background:#ffeceb;color:#a32b2b}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kpi strong{font-size:24px;display:block}.muted{color:#5f6b7b;font-size:12px}.small{font-size:11px;color:#5f6b7b}.quote{font-size:30px;font-weight:800;line-height:1.05;margin:18px 0}.quote.accent{color:#5c44db}table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{padding:8px 7px;border-bottom:1px solid #e4e8ef;text-align:left;vertical-align:top}th{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667386;background:#f7f8fb}.footer{margin-top:25px;font-size:9px;color:#7a8494;border-top:1px solid #e3e7ee;padding-top:10px}@media print{.no-print{display:none!important}}
  </style></head><body>
  <section class="cover"><div class="brand">MYFIT AI</div><h1>Personal Wellness Plan</h1><p class="subtitle">A locally generated wellness and fitness planning report tailored to the selected profile.</p><div class="meta-grid"><div class="meta"><span>Profile</span><strong>${escapeHtml(p.name||'MYFIT User')}</strong></div><div class="meta"><span>Goal</span><strong>${escapeHtml(goalLabel(p.goal))}</strong></div><div class="meta"><span>Current</span><strong>${p.weightKg} kg</strong></div><div class="meta"><span>Target</span><strong>${p.targetWeightKg} kg</strong></div></div></section>
  <h2>Profile & metrics</h2><div class="grid2"><div class="card kpi"><h3>Body metrics</h3><div class="grid2"><div><span class="small">Height</span><strong>${p.heightCm} cm</strong></div><div><span class="small">BMI</span><strong>${m.bmi}</strong></div><div><span class="small">BMR estimate</span><strong>${m.bmr||'—'} kcal</strong></div><div><span class="small">TDEE estimate</span><strong>${m.tdee||'—'} kcal</strong></div></div></div><div class="card"><h3>Routine</h3><p class="muted">${escapeHtml(goalLabel(p.goal))} · ${p.workoutDays} workouts/week · ${p.workoutMinutes} min/session · ${escapeHtml(p.dietType)} · ${p.mealsPerDay} meals/day</p><p class="muted">Cuisine: ${escapeHtml(p.cuisinePreference)} · Cooking: ${escapeHtml(p.cookingAvailability)} · Eating out: ${escapeHtml(p.eatingOutFrequency)}</p></div></div>
  <h2>Reality check</h2><div class="card"><span class="status ${m.reality.tone||'success'}">${realityLabel(m.reality)}</span><p><strong>${Math.abs(Number(p.targetWeightKg)-Number(p.weightKg)).toFixed(1)} kg planned change</strong> over ${m.reality.weeks||'—'} weeks.</p><p class="muted">${escapeHtml(m.reality.message)}</p></div>
  <h2>Nutrition plan</h2><div class="card"><p class="muted">${escapeHtml(plan?.nutrition?.principle||'')}</p><table><thead><tr><th>Meal</th><th>Recommendation & portion</th><th>Alternatives</th></tr></thead><tbody>${mealRows(plan)}</tbody></table></div>
  <h2>Workout plan</h2><div class="card"><p class="muted">${escapeHtml(plan?.workout?.trainingSplit||'')} · ${plan?.workout?.days||p.workoutDays} days · ${plan?.workout?.duration||p.workoutMinutes} min sessions.</p><table><thead><tr><th>Day</th><th>Session</th><th>Exercises</th></tr></thead><tbody>${workoutRows(plan)}</tbody></table></div>
  <h2>Weekly roadmap</h2><div class="card"><table><thead><tr><th>Week</th><th>Focus</th><th>Target</th><th>Highlight</th></tr></thead><tbody>${roadmapRows(plan)}</tbody></table></div>
  <h2>Habits</h2><div class="grid2"><div class="card"><strong>Sleep</strong><div class="muted">${p.sleepHours}h target</div></div><div class="card"><strong>Movement</strong><div class="muted">${p.dailySteps?Number(p.dailySteps).toLocaleString():'7,000'}+ steps target</div></div><div class="card"><strong>Workout</strong><div class="muted">${p.workoutDays} planned sessions/week</div></div><div class="card"><strong>Nutrition</strong><div class="muted">${p.mealsPerDay} meals/day rhythm</div></div></div>
  <h2>Progress</h2><div class="card"><p class="muted">${entries.length?`${entries.length} locally stored weight entries are included in the app. Latest recorded: ${entries[entries.length-1].weight} kg on ${escapeHtml(entries[entries.length-1].date)}.`:'No progress entries have been logged yet.'}</p><p class="muted">Workouts logged: ${state.progress?.workoutsCompleted||0} · Habit check-ins: ${state.progress?.habitsCompleted||0}</p></div>
  <h2>Safety & disclaimer</h2><div class="card"><p class="muted">MYFIT AI provides general wellness and fitness planning. It is not a medical diagnosis or treatment tool and does not replace a doctor or registered dietitian. BMI, BMR, TDEE and timeline values are estimates used for planning. The optional photo is for visual personalization only and must not be used to infer BMI, body fat, obesity or medical conditions.</p></div>
  <div class="quote">YOUR PLAN IS NOT A PUNISHMENT.</div><div class="quote accent">IT'S A SYSTEM YOU CAN ACTUALLY LIVE WITH.</div>
  <div class="footer">Generated locally by MYFIT AI. This report is designed for wellness planning and personal reflection.</div>
  <div class="no-print" style="margin-top:22px"><button onclick="window.print()" style="padding:12px 18px;border:0;border-radius:10px;background:#5c44db;color:#fff;font-weight:700;cursor:pointer">Save / Print as PDF</button></div>
  </body></html>`;
}

export function openPrintableReport(state){
  const win=window.open('', '_blank', 'noopener,noreferrer');
  if(!win){ alert('Please allow pop-ups for MYFIT AI to open the printable report.'); return false; }
  win.document.open(); win.document.write(buildReportHtml(state)); win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
  return true;
}
