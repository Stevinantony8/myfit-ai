export function round1(value) { return Math.round(value * 10) / 10; }

export function calculateBMI(weightKg, heightCm) {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  return round1(weightKg / Math.pow(heightCm / 100, 2));
}

export function bmiCategory(bmi) {
  if (bmi == null) return 'Not available';
  if (bmi < 18.5) return 'Below typical range';
  if (bmi < 25) return 'Typical range';
  if (bmi < 30) return 'Above typical range';
  return 'High range';
}

export function calculateBMR({ age, sex, weightKg, heightCm }) {
  if (!(age > 0) || !(weightKg > 0) || !(heightCm > 0)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return round1(base + (sex === 'male' ? 5 : -161));
}

export function activityFactor(activityLevel) {
  return ({ sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 })[activityLevel] ?? 1.2;
}

export function calculateTDEE(profile) {
  const bmr = calculateBMR(profile);
  return bmr ? round1(bmr * activityFactor(profile.activityLevel)) : null;
}

export function targetGap(currentKg, targetKg) {
  return round1(targetKg - currentKg);
}

export function weeksUntil(dateString) {
  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.max(0, Math.ceil((target - new Date(today.toDateString())) / 604800000));
}

export function assessTimeline(profile) {
  const currentKg = Number(profile.currentKg ?? profile.weightKg);
  const targetKg = Number(profile.targetKg ?? profile.targetWeightKg);
  const targetDate = profile.targetDate;
  const goal = profile.goal;
  const gap = Math.abs(targetKg - currentKg);
  const weeks = weeksUntil(targetDate);
  if (weeks == null || weeks === 0 || gap === 0) {
    return { status:'Define timeline', tone:'warn', weeks, gap, rate:null, message:'Add a future target date and a target that differs from your current weight.' };
  }
  const weeklyRate = round1(gap / weeks);
  let status = 'Reasonable planning pace';
  let tone = 'success';
  if (goal === 'muscle') {
    if (targetKg > currentKg && weeklyRate > 0.5) { status='Very ambitious'; tone='danger'; }
    else if (targetKg > currentKg && weeklyRate > 0.25) { status='Ambitious'; tone='warn'; }
  } else {
    if (weeklyRate > 1.0) { status='Very aggressive'; tone='danger'; }
    else if (weeklyRate > 0.75) { status='Ambitious'; tone='warn'; }
  }
  return { status, tone, weeks, gap, rate:weeklyRate, message:`Your requested change is about ${weeklyRate} kg/week over ${weeks} weeks. This is a planning estimate, not a medical prediction.` };
}

export function calculateMetrics(profile) {
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);
  const reality = assessTimeline(profile);
  return { bmi, bmiCategory:bmiCategory(bmi), bmr, tdee, reality };
}
