const W = 380;
const H = 128;
const PAD = { l: 6, r: 56, t: 18, b: 22 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  /** A$ thousands per month; the last one is month to date. */
  values: number[];
  months: string[];
  /** Year of the last month. */
  year: number;
  color: string;
}

/** Monthly revenue as an area line, marking the best month and this month. */
export function RevenueChart({ values, months, year, color }: Props) {
  if (values.length < 2) return null;
  const lo = Math.min(...values) * 0.92;
  const hi = Math.max(...values) * 1.04;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (values.length - 1);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - lo) / (hi - lo || 1));
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const base = H - PAD.b;
  const last = values.length - 1;
  const area = `M${x(0).toFixed(1)},${base} L${pts.join(' L')} L${x(last).toFixed(1)},${base} Z`;
  const iMax = values.indexOf(Math.max(...values));
  const first = months[0] ?? '';
  const lastMonth = months[last] ?? '';
  // The series spans twelve months, so the first month is in the previous year unless it is January.
  const firstYear = MONTHS.indexOf(first) > MONTHS.indexOf(lastMonth) ? year - 1 : year;
  const label = `Monthly revenue, ${LONG[MONTHS.indexOf(first)] ?? first} ${firstYear} to ${LONG[MONTHS.indexOf(lastMonth)] ?? lastMonth} ${year}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      {[0.25, 0.5, 0.75].map((f) => {
        const yy = (PAD.t + (H - PAD.t - PAD.b) * f).toFixed(1);
        return <line key={f} x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} stroke="#e6ebee" strokeWidth="1" />;
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke="#cfd8dd" />
      <path d={area} fill={color} fillOpacity=".14" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(iMax)} cy={y(values[iMax]!)} r="3" fill={color} />
      <text x={x(iMax)} y={y(values[iMax]!) - 7} textAnchor="middle">
        A${values[iMax]}K
      </text>
      <circle cx={x(last)} cy={y(values[last]!)} r="4.5" fill="#fff" stroke={color} strokeWidth="2" />
      <text x={x(last) + 8} y={y(values[last]!) + 4}>
        A${values[last]}K
      </text>
      <text x={PAD.l} y={H - 6}>
        {first} {firstYear}
      </text>
      <text x={x(last)} y={H - 6} textAnchor="end">
        {lastMonth} (to date)
      </text>
    </svg>
  );
}
