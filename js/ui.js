import { calculateMetrics } from './calculations.js';

export function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function renderProgress(step,total) {
  return `<div class="stepper">${Array.from({length:total},(_,i)=>`<span class="step-dot ${i<step?'active':''}"></span>`).join('')}</div>`;
}

export function optionCard(name,label,selected,value,description='') {
  return `<button type="button" class="option ${selected===value?'selected':''}" data-value="${escapeHtml(value)}"><strong>${escapeHtml(name)}</strong>${description?`<span>${escapeHtml(description)}</span>`:''}</button>`;
}

export function metricCard(label,value,sub='') {
  return `<div class="card tight"><div class="metric"><div><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div></div>${sub?`<div class="tiny">${escapeHtml(sub)}</div>`:''}</div>`;
}

export function metricsFor(profile) { return calculateMetrics(profile); }
