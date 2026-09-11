import { FOODS } from '../data/foods.js';
import { EXERCISES } from '../data/exercises.js';

function normalizedGoal(goal) {
  if (goal === 'fatloss') return 'fatloss';
  if (goal === 'muscle') return 'muscle';
  return 'fitness';
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim().toLowerCase()).filter(Boolean);
  return String(value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function dietAllows(food, dietType) {
  const diet = dietType || 'non-vegetarian';
  return food.diets.includes(diet);
}

function allergyBlocked(food, allergies) {
  const tokens = normalizeList(allergies).map(normalizeToken);
  if (!tokens.length) return false;
  const haystack = `${food.name} ${food.tags.join(' ')} ${food.id}`.toLowerCase();
  const aliases = {
    dairy: ['milk','yogurt','curd','paneer','buttermilk','cheese'],
    milk: ['milk','yogurt','curd','paneer','buttermilk','cheese'],
    lactose: ['milk','yogurt','curd','paneer','buttermilk','cheese'],
    egg: ['egg'], eggs: ['egg'],
    fish: ['fish'], seafood: ['fish'],
    peanut: ['peanut'], peanuts: ['peanut'],
    nuts: ['nut'], 'tree-nuts': ['nut','nuts'],
    gluten: ['roti','oats'], wheat: ['roti'],
    soy: ['soy','tofu']
  };
  return tokens.some(token => {
    const matches = aliases[token] || [token];
    return matches.some(match => haystack.includes(match));
  });
}

function preferenceBlocked(food, dislikes) {
  const tokens = normalizeList(dislikes);
  if (!tokens.length) return false;
  const haystack = `${food.name} ${food.tags.join(' ')}`.toLowerCase();
  return tokens.some(token => haystack.includes(token));
}

function cuisineScore(food, cuisinePreference) {
  const preference = normalizeToken(cuisinePreference);
  if (!preference || preference === 'mixed' || preference === 'pan-indian') return 1;
  return food.cuisine.includes(preference) ? 3 : 0;
}

function cookingScore(food, cookingAvailability) {
  const pref = cookingAvailability || 'moderate';
  if (pref === 'limited') return food.prepMinutes <= 15 && ['easy','none'].includes(food.cooking) ? 3 : 0;
  if (pref === 'moderate') return food.prepMinutes <= 35 ? 2 : 0;
  return 1;
}

function budgetScore(food, budget) {
  if (!budget || budget === 'flexible') return 1;
  if (budget === food.budget) return 2;
  if (budget === 'low' && food.budget === 'medium') return 0;
  return 1;
}

function workoutFitScore(food, workoutTiming) {
  if (!workoutTiming || workoutTiming === 'flexible') return 1;
  return food.workoutFit.includes(workoutTiming) ? 3 : food.workoutFit.includes('any') ? 1 : 0;
}

function goalScore(food, goal) {
  if (goal === 'muscle') return food.tags.includes('high-protein') ? 4 : food.tags.includes('balanced') ? 1 : 0;
  if (goal === 'fatloss') return food.tags.includes('high-fibre') ? 4 : food.tags.includes('high-protein') ? 3 : food.tags.includes('balanced') ? 2 : 0;
  return food.tags.includes('balanced') ? 3 : food.tags.includes('high-protein') ? 2 : 1;
}

function scoreFood(food, profile, goal) {
  const eatingOutBoost = profile.eatingOutFrequency === 'often' && (food.tags.includes('quick') || food.prepMinutes <= 15) ? 2 : 0;
  return goalScore(food, goal)
    + cuisineScore(food, profile.cuisinePreference)
    + cookingScore(food, profile.cookingAvailability)
    + budgetScore(food, profile.budget)
    + workoutFitScore(food, profile.workoutTiming)
    + eatingOutBoost
    + (food.tags.includes('quick') && Number(profile.workoutMinutes) <= 30 ? 1 : 0);
}

function safeCalorieTarget(tdee, goal, safetyBlocked=false, extreme=false) {
  if (!tdee || safetyBlocked || extreme) return null;
  // Conservative planning ranges only; not a medical prescription.
  if (goal === 'fatloss') return Math.round(Math.max(tdee - 400, tdee * 0.8));
  if (goal === 'muscle') return Math.round(tdee + 200);
  return Math.round(tdee);
}

function safetyFlags(profile, metrics){
  const flags=[];
  if(profile.pregnancyStatus==='pregnant') flags.push('pregnancy');
  if(profile.pregnancyStatus==='postpartum') flags.push('postpartum');
  if(profile.significantMedicalCondition) flags.push('medical');
  if(profile.eatingConcern) flags.push('eating');
  if(String(profile.injuryOrMedicalConcern||'').trim()) flags.push('injury');
  if(metrics?.reality?.tone==='danger') flags.push('extreme_timeline');
  return flags;
}

function safetyBlocked(flags){ return flags.some(f=>['pregnancy','postpartum','medical','eating'].includes(f)); }


function mealCountSlots(count) {
  const requested = Math.min(Math.max(Number(count) || 4, 2), 6);
  if (requested === 2) return ['breakfast','dinner'];
  if (requested === 3) return ['breakfast','lunch','dinner'];
  if (requested === 4) return ['breakfast','lunch','snack','dinner'];
  if (requested === 5) return ['breakfast','snack','lunch','snack','dinner'];
  return ['breakfast','snack','lunch','snack','snack','dinner'];
}

function alternativesFor(slot, chosen, candidates, max = 2) {
  return candidates.filter(food => food.id !== chosen.id && food.mealTypes.includes(slot))
    .sort((a,b) => b.score - a.score)
    .slice(0,max)
    .map(food => ({ name: food.name, portion: food.portion.label }));
}

function buildFoodPool(profile, goal) {
  return FOODS
    .filter(food => dietAllows(food, profile.dietType))
    .filter(food => !allergyBlocked(food, profile.allergies))
    .filter(food => !preferenceBlocked(food, profile.dislikedFoods))
    .map(food => ({ ...food, score: scoreFood(food, profile, goal) }))
    .sort((a,b) => b.score - a.score);
}

export function generateNutritionPlan(profile, metrics) {
  const goal = normalizedGoal(profile.goal);
  const pool = buildFoodPool(profile, goal);
  const slots = mealCountSlots(profile.mealsPerDay);
  const used = new Set();
  const mealOptions = [];

  for (const slot of slots) {
    const candidates = pool.filter(food => food.mealTypes.includes(slot));
    const chosen = candidates.find(food => !used.has(food.id)) || candidates[0];
    if (!chosen) continue;
    used.add(chosen.id);
    mealOptions.push({
      slot: slot[0].toUpperCase()+slot.slice(1),
      item: chosen,
      portion: chosen.portion.label,
      alternatives: alternativesFor(slot, chosen, candidates)
    });
  }

  const warnings = [];
  if (!pool.length) warnings.push('No matching meals were found after applying your diet, allergy and dislike filters. Broaden one preference to continue.');
  if (goal === 'fatloss') warnings.push('Portions and calorie estimates are planning aids only; avoid extreme restriction and adjust based on hunger, performance and professional guidance where needed.');
  if (goal === 'muscle') warnings.push('Muscle gain is supported by consistent training, adequate food and protein; the plan does not guarantee a specific rate of change.');

  return {
    calorieTarget: safeCalorieTarget(metrics.tdee, goal),
    meals: mealOptions,
    principle: goal === 'muscle' ? 'Prioritize regular protein-rich meals, balanced carbohydrates and recovery-friendly timing.' : goal === 'fatloss' ? 'Prioritize protein, fibre, portion awareness and practical meals you can repeat consistently.' : 'Prioritize balanced Indian meals, regular movement, hydration and a routine you can sustain.',
    filtersApplied: {
      dietType: profile.dietType,
      allergies: normalizeList(profile.allergies),
      dislikedFoods: normalizeList(profile.dislikedFoods),
      cuisinePreference: profile.cuisinePreference || 'mixed',
      mealsPerDay: Number(profile.mealsPerDay) || 4,
      cookingAvailability: profile.cookingAvailability || 'moderate',
      budget: profile.budget || 'flexible',
      eatingOutFrequency: profile.eatingOutFrequency || 'sometimes',
      workoutTiming: profile.workoutTiming || 'flexible'
    },
    warnings
  };
}

function levelFromProfile(profile) {
  const raw = String(profile.trainingExperience || 'beginner').toLowerCase();
  return ['beginner','intermediate','advanced'].includes(raw) ? raw : 'beginner';
}

function resolveMode(profile) {
  if (profile.gymAccess) return 'gym';
  return 'home';
}

function levelRank(level){ return ({beginner:1, intermediate:2, advanced:3})[level] || 1; }

function exerciseAllowed(exercise, profile, goal) {
  const mode = resolveMode(profile);
  const level = levelFromProfile(profile);
  if (!exercise.modes.includes(mode)) return false;
  if (!exercise.goals.includes(goal)) return false;
  if (!exercise.level.includes(level)) return false;
  return true;
}

function equipmentAvailable(exercise, profile) {
  if (!profile.gymAccess) return exercise.equipment.every(x => ['none','stairs'].includes(x));
  const selected = Array.isArray(profile.equipment) ? profile.equipment : ['none','dumbbells','machine','cable','bike','bench','treadmill','stairs'];
  return exercise.equipment.every(x => x === 'none' || selected.includes(x));
}

function goalPatterns(goal) {
  if (goal === 'muscle') return ['legs','push','pull','hinge','core'];
  if (goal === 'fatloss') return ['cardio','legs','push','cardio','core'];
  return ['legs','push','pull','core','cardio'];
}

function focusLabel(pattern){
  return ({legs:'Lower body',push:'Push strength',pull:'Pull strength',hinge:'Posterior chain',core:'Core',cardio:'Cardio & conditioning',mobility:'Mobility & recovery'})[pattern] || 'Full body';
}

function sessionStructure(duration, goal, level){
  const warmup = duration <= 30 ? 4 : duration <= 60 ? 7 : 10;
  const cooldown = duration <= 30 ? 3 : duration <= 60 ? 5 : 8;
  const main = Math.max(duration - warmup - cooldown, 10);
  const strengthBlocks = goal === 'muscle' ? (duration <= 30 ? 3 : duration <= 60 ? 5 : 7) : (duration <= 30 ? 2 : duration <= 60 ? 4 : 5);
  return { warmup, main, cooldown, strengthBlocks };
}

function prescription(exercise, goal, level, duration){
  const advanced = level === 'advanced';
  const sets = exercise.pattern === 'cardio' || exercise.pattern === 'mobility' ? 1 : (goal === 'muscle' ? (advanced ? 4 : 3) : 2 + (duration >= 60 ? 1 : 0));
  let reps = exercise.defaultReps;
  if (exercise.pattern === 'cardio') reps = duration <= 30 ? '10–15 min' : duration <= 60 ? '15–25 min' : '20–35 min';
  if (exercise.pattern === 'mobility') reps = '5–10 min';
  return { sets, reps, restSec: exercise.restSec, durationMin: exercise.pattern === 'cardio' ? Math.min(Math.round(duration * 0.45), Number(reps.match(/\d+/)?.[0] || 15)) : Math.max(5, Math.round(sets * 3.5)) };
}

function uniqueById(items){
  const seen = new Set();
  return items.filter(x => !seen.has(x.id) && seen.add(x.id));
}

function workoutPool(profile, goal){
  return EXERCISES.filter(ex => exerciseAllowed(ex, profile, goal) && equipmentAvailable(ex, profile));
}

function alternativesForExercise(exercise, pool){
  const names = exercise.alternatives || [];
  const direct = names.map(name => pool.find(e => e.name === name)).filter(Boolean);
  return uniqueById(direct).slice(0,3).map(e => e.name);
}

function buildSession(pattern, profile, goal, pool, index){
  const duration = Math.max(Number(profile.workoutMinutes) || 30, 15);
  const level = levelFromProfile(profile);
  const structure = sessionStructure(duration, goal, level);
  let candidates = pool.filter(e => e.pattern === pattern);
  if (!candidates.length) candidates = pool.filter(e => e.pattern === 'mobility');

  const limit = pattern === 'cardio' ? 1 : pattern === 'mobility' ? 1 : duration <= 30 ? 3 : duration <= 60 ? 4 : 6;
  const exercises = candidates.slice(0, limit).map((exercise, i) => ({
    ...exercise,
    order: i+1,
    prescription: prescription(exercise, goal, level, duration),
    alternatives: alternativesForExercise(exercise, pool)
  }));

  // For longer sessions, add a complementary core/mobility block rather than padding with redundant exercises.
  if (duration >= 60 && pattern !== 'cardio') {
    const complement = pool.find(e => ['core','mobility'].includes(e.pattern) && !exercises.some(x => x.id === e.id));
    if (complement) exercises.push({ ...complement, order: exercises.length+1, prescription: prescription(complement, goal, level, duration), alternatives: alternativesForExercise(complement,pool) });
  }

  const notes = [];
  if (duration <= 30) notes.push('Short-session priority: focus on the highest-value movements and keep transitions tight.');
  if (duration >= 90) notes.push('Long-session structure: warm up, complete the main work with controlled rest, then finish with accessory/core or mobility work.');
  if (goal === 'fatloss' && !profile.gymAccess) notes.push('Add easy walking on non-training days rather than turning every session into a high-intensity workout.');

  return {
    day:`Day ${index+1}`,
    focus:focusLabel(pattern),
    duration,
    warmup:{ minutes:structure.warmup, activities: pattern === 'cardio' ? 'Easy movement + gradual pace increase' : exercises[0]?.warmup || '5 minutes of easy movement and joint mobility' },
    exercises,
    cooldown:{ minutes:structure.cooldown, activities: exercises[0]?.cooldown || 'Easy walking and relaxed mobility' },
    notes
  };
}

export function generateWorkoutPlan(profile) {
  const goal = normalizedGoal(profile.goal);
  const days = Math.min(Math.max(Number(profile.workoutDays) || 3, 2), 6);
  const duration = Math.min(Math.max(Number(profile.workoutMinutes) || 30, 15), 120);
  const level = levelFromProfile(profile);
  const mode = resolveMode(profile);
  const pool = workoutPool(profile, goal);
  const injuryNote = String(profile.injuryOrMedicalConcern || '').trim();
  const patterns = goalPatterns(goal);
  const sessions = Array.from({length:days}, (_,i) => buildSession(patterns[i % patterns.length], profile, goal, pool, i));

  const warnings = [];
  if (injuryNote) warnings.push('You noted an injury or medical concern. Get appropriate professional guidance before starting or modifying an exercise program.');
  if (goal === 'muscle') warnings.push('Use controlled technique and choose loads that allow good form. The plan is not a diagnosis or individualized medical rehabilitation program.');
  if (!profile.gymAccess && goal === 'fatloss') warnings.push('No-gym mode emphasizes walking, bodyweight work, stairs and mobility; it does not require gym equipment.');
  if (!pool.length) warnings.push('The selected combination of goal, level and equipment produced no matching exercise blocks. Try adding equipment or choosing a broader workout preference.');

  return {
    goal, level, mode, days, duration,
    trainingSplit: goal === 'muscle' ? (days >= 5 ? 'Upper/lower emphasis with accessory days' : days === 4 ? 'Upper / lower / upper / lower' : 'Full-body resistance with rotating emphasis') : goal === 'fatloss' && !profile.gymAccess ? 'Walking + bodyweight + mobility' : 'Balanced strength + conditioning',
    sessions,
    equipment: Array.isArray(profile.equipment) ? profile.equipment : [],
    warnings,
    safety: 'Stop if you experience significant pain, dizziness, chest pain or unusual symptoms and seek appropriate professional guidance.'
  };
}

function generateRoadmap(profile, metrics){
  const weeks=Math.min(Math.max(Number(metrics?.reality?.weeks)||8,4),12);
  const goal=normalizedGoal(profile.goal);
  const titles=goal==='muscle'
    ? ['Build the base','Own the movement','Add consistency','Progress the load','Strength focus','Refine technique','Recover & consolidate','Review & reset']
    : goal==='fatloss'
      ? ['Build the routine','Lock in meals','Increase daily movement','Strength + consistency','Keep it repeatable','Review your trend','Protect recovery','Review & reset']
      : ['Build the base','Movement rhythm','Consistency first','Strength + stamina','Keep it practical','Review your trend','Recover well','Review & reset'];
  return Array.from({length:weeks},(_,i)=>({
    week:i+1,
    title:titles[i%titles.length],
    target:goal==='muscle'?'Complete planned strength sessions and keep protein-rich meals consistent.':goal==='fatloss'?'Follow the meal rhythm, complete planned movement and review trends without chasing rapid changes.':'Complete the planned movement, sleep and nutrition habits consistently.',
    highlight:i===0?'Start with consistency, not perfection.':i===weeks-1?'Review your progress and decide the next sustainable step.':'Keep the next week simple and repeatable.'
  }));
}

export function generatePlan(profile, metrics) {
  const flags = safetyFlags(profile, metrics);
  const blocked = safetyBlocked(flags);
  const nutrition = generateNutritionPlan(profile, metrics);
  const workout = generateWorkoutPlan(profile);

  if(blocked){
    nutrition.calorieTarget = null;
    nutrition.meals = [];
    nutrition.warnings = [...(nutrition.warnings||[]), 'Personalized nutrition targets are limited because a safety concern was flagged. Please seek appropriate professional guidance before making significant dietary changes.'];
    workout.sessions = [];
    workout.warnings = [...(workout.warnings||[]), 'Personalized exercise programming is limited because a safety concern was flagged. Please seek appropriate professional guidance before beginning or changing an exercise program.'];
  } else if(flags.includes('extreme_timeline')) {
    nutrition.calorieTarget = null;
    nutrition.warnings = [...(nutrition.warnings||[]), 'The requested timeline is unusually aggressive. The planner does not prescribe extreme restriction or guarantee weight loss; consider a longer timeline and appropriate professional guidance.'];
    workout.warnings = [...(workout.warnings||[]), 'Your target timeline is unusually aggressive. Focus on sustainable movement and recovery rather than trying to compensate with excessive exercise.'];
  }

  return {
    nutrition,
    workout,
    roadmap: generateRoadmap(profile, metrics),
    habits:['Water target','Daily movement','Planned workout','Consistent sleep'],
    safety:{flags, blocked, guidance: blocked ? 'Professional guidance recommended before following a personalized weight-loss or exercise plan.' : flags.includes('extreme_timeline') ? 'Timeline reconsideration recommended; avoid extreme restriction or excessive exercise.' : flags.includes('injury') ? 'Professional guidance recommended before starting or modifying exercise.' : ''}
  };
}
