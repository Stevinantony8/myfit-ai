const KEY = 'myfit-ai-core-v1';

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('MYFIT AI could not save local data.', error);
    return false;
  }
}

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch (error) { console.warn('MYFIT AI could not read local data.', error); return null; }
}

export function clearState() {
  try { localStorage.removeItem(KEY); return true; }
  catch (error) { console.warn('MYFIT AI could not clear local data.', error); return false; }
}
