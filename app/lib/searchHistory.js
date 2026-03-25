const KEY = 'shopgpt_search_history';
const MAX = 500;

function isClient() {
  return typeof window !== 'undefined';
}

/**
 * Record a search query with a timestamp.
 * @param {string} term
 */
export function recordSearch(term) {
  if (!isClient() || !term) return;
  try {
    const history = getHistory();
    history.unshift({term: term.toLowerCase(), ts: Date.now()});
    if (history.length > MAX) history.length = MAX;
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // localStorage full or unavailable
  }
}

function isValidEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const {term, ts} = entry;
  if (typeof term !== 'string' || !term.trim()) return false;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
  const d = new Date(ts);
  return !Number.isNaN(d.getTime());
}

/**
 * Return the full history array, newest first.
 * @returns {Array<{term: string, ts: number}>}
 */
export function getHistory() {
  if (!isClient()) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(isValidEntry).map((e) => ({
      term: e.term.trim().toLowerCase(),
      ts: e.ts,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete all search history.
 */
export function clearHistory() {
  if (!isClient()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
