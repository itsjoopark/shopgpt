import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function CustomTooltip({active, payload, label, period}) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const valid = !Number.isNaN(d.getTime());
  let dateLabel;
  if (!valid) {
    dateLabel = String(label);
  } else if (period === '6months') {
    dateLabel = d.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
  } else {
    dateLabel = d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
  return (
    <div className="search-history-tooltip">
      <div className="search-history-tooltip-date">{dateLabel}</div>
      <div className="search-history-tooltip-count">
        {payload[0].value} {payload[0].value === 1 ? 'search' : 'searches'}
      </div>
    </div>
  );
}

/**
 * Recharts-only panel — must only be mounted on the client (dynamic import from parent).
 */
export default function SearchHistoryChartPanel({
  chartData,
  period,
  selectedDate,
  tickFormatter,
  onBarClick,
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{top: 8, right: 4, left: -20, bottom: 0}}
      >
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          tick={{fontSize: 12, fill: '#A3A3A3'}}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{fontSize: 12, fill: '#A3A3A3'}}
          width={40}
        />
        <Tooltip
          content={<CustomTooltip period={period} />}
          cursor={{fill: 'rgba(108, 60, 225, 0.04)'}}
        />
        <Bar
          dataKey="searches"
          radius={[4, 4, 0, 0]}
          cursor="pointer"
          onClick={(data, index) => {
            const row =
              data?.payload ??
              (typeof index === 'number' ? chartData[index] : null);
            onBarClick(row);
          }}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.date}
              fill={selectedDate === entry.date ? '#5B21B6' : '#6C3CE1'}
              fillOpacity={
                selectedDate && selectedDate !== entry.date ? 0.3 : 0.85
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
