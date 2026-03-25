import {useState, useEffect, useMemo} from 'react';
import {useNavigate} from 'react-router';
import {getHistory, clearHistory} from '~/lib/searchHistory';

const PERIODS = [
  {key: 'today', label: 'Today', ms: 1},
  {key: 'week', label: 'This week', ms: 7},
  {key: 'month', label: 'This month', ms: 30},
  {key: '6months', label: 'Past 6 months', ms: 180},
];

function startOfDay(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date(0);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** UTC date key YYYY-MM-DD; null if ts invalid (avoids RangeError from toISOString) */
function dayKeyUtc(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateStr, period) {
  const d = new Date(dateStr);
  if (period === 'today') {
    return d.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
  }
  if (period === 'week') {
    return d.toLocaleDateString(undefined, {weekday: 'short'});
  }
  if (period === 'month') {
    return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  }
  return d.toLocaleDateString(undefined, {month: 'short', year: '2-digit'});
}

function buildChartData(history, periodKey) {
  const periodDef = PERIODS.find((p) => p.key === periodKey);
  const now = Date.now();
  const cutoff = startOfDay(new Date(now - (periodDef.ms - 1) * 86400000)).getTime();

  const filtered = history.filter((h) => h.ts >= cutoff);

  if (periodKey === '6months') {
    const buckets = {};
    filtered.forEach((h) => {
      const d = new Date(h.ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({date: key, searches: count}));
  }

  const buckets = {};
  filtered.forEach((h) => {
    const key = dayKeyUtc(h.ts);
    if (!key) return;
    buckets[key] = (buckets[key] || 0) + 1;
  });

  const days = [];
  const start = startOfDay(new Date(cutoff));
  const end = startOfDay(new Date(now));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({date: key, searches: buckets[key] || 0});
  }
  return days;
}

function buildTermList(history, periodKey, selectedDate) {
  const periodDef = PERIODS.find((p) => p.key === periodKey);
  const now = Date.now();
  const cutoff = startOfDay(new Date(now - (periodDef.ms - 1) * 86400000)).getTime();

  let filtered = history.filter((h) => h.ts >= cutoff);

  if (selectedDate) {
    if (periodKey === '6months') {
      filtered = filtered.filter((h) => {
        const d = new Date(h.ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedDate;
      });
    } else {
      filtered = filtered.filter((h) => dayKeyUtc(h.ts) === selectedDate);
    }
  }

  const counts = {};
  filtered.forEach((h) => {
    counts[h.term] = (counts[h.term] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([term, count]) => ({term, count}))
    .sort((a, b) => b.count - a.count);
}

export function SearchHistoryView() {
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [ChartPanel, setChartPanel] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (!history.length) {
      setChartPanel(null);
      return;
    }
    let cancelled = false;
    import('./SearchHistoryChartPanel.jsx').then((mod) => {
      if (!cancelled) setChartPanel(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [history.length]);

  const chartData = useMemo(
    () => buildChartData(history, period),
    [history, period],
  );

  const termList = useMemo(
    () => buildTermList(history, period, selectedDate),
    [history, period, selectedDate],
  );

  const totalSearches = useMemo(
    () => chartData.reduce((sum, d) => sum + d.searches, 0),
    [chartData],
  );

  function handleClear() {
    clearHistory();
    setHistory([]);
    setSelectedDate(null);
  }

  function handleBarClick(data) {
    if (!data?.date) return;
    setSelectedDate((prev) => (prev === data.date ? null : data.date));
  }

  if (!history.length) {
    return (
      <div className="search-history-panel">
        <div className="search-history-empty">
          <div className="search-history-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3>No search history yet</h3>
          <p>Your searches will appear here so you can track what you&apos;ve been looking for over time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-history-panel">
      <div className="search-history-header">
        <div>
          <h2>Search Activity</h2>
          <span className="search-history-total">
            {totalSearches} {totalSearches === 1 ? 'search' : 'searches'}
            {selectedDate && (
              <button
                className="search-history-clear-filter"
                onClick={() => setSelectedDate(null)}
              >
                Clear filter
              </button>
            )}
          </span>
        </div>
        <button className="search-history-clear-btn" onClick={handleClear}>
          Clear history
        </button>
      </div>

      <div className="search-history-period-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`search-history-period-tab${period === p.key ? ' active' : ''}`}
            onClick={() => {
              setPeriod(p.key);
              setSelectedDate(null);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="search-history-chart">
        {ChartPanel ? (
          <ChartPanel
            chartData={chartData}
            period={period}
            selectedDate={selectedDate}
            tickFormatter={(v) => formatDayLabel(v, period)}
            onBarClick={handleBarClick}
          />
        ) : (
          <div
            className="search-history-chart-placeholder"
            style={{height: 240}}
            aria-hidden
          />
        )}
      </div>

      <div className="search-history-term-list">
        <div className="search-history-term-list-header">
          <span>Search term</span>
          <span>Count</span>
        </div>
        {termList.length === 0 ? (
          <div className="search-history-term-empty">
            No searches in this period
          </div>
        ) : (
          termList.map(({term, count}) => (
            <div key={term} className="search-history-term-item">
              <button
                className="search-history-term-text"
                onClick={() => navigate(`/search?q=${encodeURIComponent(term)}`)}
                title={`Search again for "${term}"`}
              >
                {term}
                <span className="search-history-term-arrow">&rarr;</span>
              </button>
              <span className="search-history-term-count">{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
