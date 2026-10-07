import { Download, TrendingUp } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";

import { semanticChartColors } from "@/config/dataVisualization";
import type { DashboardChart } from "@/features/dashboard/types";

import styles from "./DashboardView.module.css";

const colors = ["var(--reference-orange)", "var(--reference-cyan)", "var(--reference-violet)", "var(--reference-green)", "var(--reference-yellow)"];
const number = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  // Horizontal control points keep interpolation within the adjacent real values.
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middle = (previous.x + current.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

export function ModuleChart({ chart }: { chart: DashboardChart }) {
  const id = useId();
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const series = chart.series.filter((point) => Number.isFinite(point.value));
  const total = series.reduce((sum, point) => sum + Math.max(0, point.value), 0);
  const maximum = chart.maxValue ?? Math.max(1, ...series.map((point) => point.value));
  const minimum = Math.min(0, ...series.map((point) => point.value));
  const range = maximum - minimum || 1;
  const smallIntegerScale = Number.isInteger(maximum) && Number.isInteger(minimum) && range <= 4 && series.every((point) => Number.isInteger(point.value));
  const axisValues = smallIntegerScale ? Array.from({ length: range + 1 }, (_, index) => maximum - index) : [4, 3, 2, 1, 0].map((step) => minimum + range * step / 4);
  const isGauge = chart.unit === "%" && series.length === 1 && series[0].value >= 0 && series[0].value <= 100;
  const kind = isGauge ? "gauge" : chart.kind ?? "bar";
  const isProgress = kind === "bar" && chart.unit === "%";
  const x = (index: number) => series.length === 1 ? 332 : 70 + index * 500 / (series.length - 1);
  const y = (value: number) => 183 - (value - minimum) / range * 142;
  const pointColor = (index: number) => series[index].tone ? semanticChartColors[series[index].tone!] : colors[index % colors.length];
  const areaId = `${id}-area`;
  const gaugeId = `${id}-gauge`;
  const points = series.map((point, index) => ({ x: x(index), y: y(point.value) }));
  const path = smoothPath(points);
  const selected = activePoint === null ? undefined : series[activePoint];
  let accumulated = 0;

  function download() {
    const quote = (value: string) => {
      const safeValue = /^[\t\r]|^[\s\uFEFF]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replaceAll('"', '""')}"`;
    };
    const csv = ["Nhãn,Giá trị,Đơn vị", ...series.map((point) => `${quote(point.label)},${point.value},${quote(chart.unit ?? "")}`)].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${chart.key}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <section aria-labelledby={id} className={styles.chartPanel} data-chart-kind={kind} data-dashboard-panel>
    <header className={styles.chartHeader}>
      <h2 id={id}>{chart.title}</h2>
      <div className={styles.chartActions}>{chart.unit ? <span>{chart.unit}</span> : null}<button aria-label={`Tải số liệu ${chart.title}`} className={styles.chartExport} disabled={!series.length} onClick={download} type="button"><Download aria-hidden="true" size={18} strokeWidth={1.7} /></button></div>
    </header>
    {!series.length ? <div className={styles.chartEmpty}>Chưa có dữ liệu</div> : isGauge ? <div className={styles.gaugeContent}>
      <div className={styles.gaugeFigure}>
        <svg aria-label={`${series[0].label}: ${number(series[0].value)}%`} role="img" viewBox="0 0 280 166">
          <title>{`${series[0].label}: ${number(series[0].value)}%`}</title>
          <defs><linearGradient id={gaugeId} x1="0" x2="1" y1="1" y2="0"><stop offset="0%" stopColor="var(--reference-orange)" /><stop offset="100%" stopColor="var(--reference-yellow)" /></linearGradient></defs>
          <path className={styles.gaugeTrack} d="M 35 139 A 105 105 0 0 1 245 139" fill="none" pathLength="100" strokeWidth="29" />
          <path d="M 35 139 A 105 105 0 0 1 245 139" fill="none" pathLength="100" stroke={`url(#${gaugeId})`} strokeDasharray={`${series[0].value} 100`} strokeWidth="29" />
          <text className={styles.axisText} textAnchor="start" x="20" y="164">0%</text><text className={styles.axisText} textAnchor="end" x="260" y="164">100%</text>
        </svg>
        <div className={styles.gaugeValue}><span><TrendingUp aria-hidden="true" size={22} strokeWidth={1.6} /></span><strong>{number(series[0].value)}%</strong></div>
      </div>
      <span className={styles.gaugeLabel}>{series[0].label}</span>
    </div> : kind === "donut" ? <div className={styles.donutContent}>
      <div className={styles.donutFigure}>
        <svg aria-hidden="true" viewBox="0 0 200 200"><circle className={styles.donutTrack} cx="100" cy="100" r="76" fill="none" strokeWidth="25" />
          {total > 0 ? series.map((point, index) => {
            const fraction = Math.max(0, point.value) / total;
            const offset = accumulated;
            accumulated += fraction;
            return <circle key={`${point.label}-${index}`} cx="100" cy="100" r="76" fill="none" stroke={pointColor(index)} strokeWidth="25" pathLength="100" strokeDasharray={`${fraction * 100} ${100 - fraction * 100}`} strokeDashoffset={-offset * 100} transform="rotate(-90 100 100)" />;
          }) : null}
        </svg><div className={styles.donutTotal}><strong>{number(total)}</strong><span>{chart.unit ?? "Tổng cộng"}</span></div>
      </div>
      <ul className={styles.legend}>{series.map((point, index) => <li key={`${point.label}-${index}`}><span className={styles.legendDot} style={{ background: pointColor(index) }} /><span>{point.label}</span><strong>{number(point.value)}</strong><small>{total ? Math.round(point.value / total * 100) : 0}%</small></li>)}</ul>
    </div> : kind === "line" ? <div className={styles.lineContent}>
      {selected ? <div className={styles.chartTooltip}><strong>{selected.label}</strong><span>{number(selected.value)} {chart.unit}</span></div> : null}
      <svg aria-label={chart.title} role="img" viewBox="0 20 610 204"><title>{chart.title}</title><desc>{series.map((point) => `${point.label}: ${number(point.value)} ${chart.unit ?? ""}`).join("; ")}</desc>
        <defs><linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--reference-orange)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--reference-orange)" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((step) => <g key={step}><line className={styles.gridLine} x1="70" x2="580" y1={41 + step * 35.5} y2={41 + step * 35.5} /><text className={styles.axisText} x="55" y={45 + step * 35.5} textAnchor="end">{compact(maximum - step * range / 4)}</text></g>)}
        {series.length > 1 ? <path d={`${path} L ${x(series.length - 1)} 183 L ${x(0)} 183 Z`} fill={`url(#${areaId})`} /> : null}
        {series.length > 1 ? <path d={path} fill="none" stroke="var(--reference-orange)" strokeWidth="4.5" strokeLinecap="round" /> : null}
        {series.map((point, index) => <g key={`${point.label}-${index}`}><circle aria-label={`${point.label}: ${number(point.value)} ${chart.unit ?? ""}`} className={styles.linePoint} cx={x(index)} cy={y(point.value)} r={activePoint === index ? 7 : 5} fill="var(--reference-orange)" onBlur={() => setActivePoint(null)} onFocus={() => setActivePoint(index)} onMouseEnter={() => setActivePoint(index)} onMouseLeave={() => setActivePoint(null)} stroke="var(--surface)" strokeWidth="3" tabIndex={0}><title>{`${point.label}: ${number(point.value)} ${chart.unit ?? ""}`}</title></circle><text className={styles.axisText} x={x(index)} y="215" textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>{point.label}</text></g>)}
      </svg>
    </div> : isProgress ? <ul className={styles.progressBars}>{series.map((point, index) => <li key={`${point.label}-${index}`}><div><span>{point.label}</span><strong>{number(point.value)}%</strong></div><div className={styles.progressTrack}><span style={{ "--bar-width": `${Math.max(0, Math.min(100, point.value / maximum * 100))}%`, "--bar-color": pointColor(index) } as CSSProperties} /></div></li>)}</ul> : <div className={styles.columnChart}>
      <div aria-hidden="true" className={styles.columnAxis}>{axisValues.map((value, index) => <span key={index}>{compact(value)}</span>)}</div>
      <ul className={styles.columns} style={{ "--bar-count": series.length } as CSSProperties}>{series.map((point, index) => <li key={`${point.label}-${index}`}><div className={styles.columnSlot}><strong>{number(point.value)}</strong><span className={styles.columnBar} style={{ "--bar-height": `${Math.max(0, Math.min(100, (point.value - minimum) / range * 100))}%`, "--bar-color": pointColor(index) } as CSSProperties} /></div><span className={styles.columnLabel}>{point.label}</span></li>)}</ul>
    </div>}
    {series.length ? <details className={styles.chartData}><summary>Xem số liệu</summary><table><caption>{chart.title}{chart.unit ? ` (${chart.unit})` : ""}</caption><thead><tr><th scope="col">Nhãn</th><th scope="col">Giá trị</th></tr></thead><tbody>{series.map((point, index) => <tr key={`${point.label}-${index}`}><th scope="row">{point.label}</th><td>{number(point.value)}</td></tr>)}</tbody></table></details> : null}
  </section>;
}
