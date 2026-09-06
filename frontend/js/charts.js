// Small, dependency-free SVG chart renderer.
//
// The production CSP is `script-src 'self'` and there's no chart library in
// package.json, so this draws plain inline SVG instead of pulling in
// Chart.js/D3 from a CDN — zero new dependencies, works under the existing
// security policy, and is easy to theme with the app's own CSS variables.

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

function formatLabel(raw, mode) {
  if (mode === 'trend') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }
  const s = String(raw);
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}

function formatValue(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * Renders a chart into `container`.
 * @param {HTMLElement} container
 * @param {{label: string, value: number}[]} series
 * @param {{type: 'line'|'bar', mode: 'trend'|'breakdown', color?: string, emptyMessage?: string}} opts
 */
export function renderChart(container, series, opts = {}) {
  container.innerHTML = '';
  const { type = 'line', mode = 'trend', color = 'var(--color-teal)', emptyMessage = 'No data for this selection yet.' } = opts;

  if (!series || series.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-muted text-sm chart-empty';
    p.textContent = emptyMessage;
    container.appendChild(p);
    return;
  }

  const width = container.clientWidth || 640;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 48, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxVal = niceMax(Math.max(...series.map((d) => d.value), 0));
  const minVal = Math.min(0, Math.min(...series.map((d) => d.value)));
  const svg = el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width: '100%',
    height,
    role: 'img',
    'aria-label': `${type} chart`,
    class: 'admin-chart-svg',
  });

  const yFor = (v) => padding.top + plotHeight - ((v - minVal) / (maxVal - minVal || 1)) * plotHeight;
  const xStep = series.length > 1 ? plotWidth / (series.length - (type === 'line' ? 1 : 0)) : plotWidth;

  // Gridlines + y-axis labels
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const v = minVal + ((maxVal - minVal) * i) / gridCount;
    const y = yFor(v);
    svg.appendChild(el('line', {
      x1: padding.left, x2: width - padding.right, y1: y, y2: y,
      stroke: 'var(--color-border)', 'stroke-width': 1,
    }));
    const label = el('text', {
      x: padding.left - 10, y: y + 4, 'text-anchor': 'end',
      class: 'chart-axis-label',
    });
    label.textContent = formatValue(v);
    svg.appendChild(label);
  }

  // X-axis labels — thin out if there are many points so they don't overlap.
  const maxLabels = Math.max(4, Math.floor(plotWidth / 70));
  const labelStride = Math.max(1, Math.ceil(series.length / maxLabels));

  if (type === 'bar') {
    const barGap = Math.min(24, xStep * 0.3);
    const barWidth = Math.max(4, xStep - barGap);
    series.forEach((d, i) => {
      const x = padding.left + i * xStep + barGap / 2;
      const rect = el('rect', {
        x, y: yFor(d.value), width: barWidth, height: Math.max(1, yFor(0) - yFor(d.value)),
        fill: color, rx: 4,
        class: 'admin-chart-bar',
      });
      const title = el('title', {});
      title.textContent = `${d.label}: ${formatValue(d.value)}`;
      rect.appendChild(title);
      svg.appendChild(rect);

      if (i % labelStride === 0) {
        const text = el('text', {
          x: x + barWidth / 2, y: height - padding.bottom + 20, 'text-anchor': 'middle',
          class: 'chart-axis-label',
        });
        text.textContent = formatLabel(d.label, mode);
        svg.appendChild(text);
      }
    });
  } else {
    const points = series.map((d, i) => [padding.left + i * xStep, yFor(d.value)]);
    const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    const areaD = `${pathD} L${points[points.length - 1][0]},${yFor(minVal)} L${points[0][0]},${yFor(minVal)} Z`;

    svg.appendChild(el('path', { d: areaD, fill: color, opacity: 0.12, stroke: 'none' }));
    svg.appendChild(el('path', { d: pathD, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    series.forEach((d, i) => {
      const [x, y] = points[i];
      const circle = el('circle', { cx: x, cy: y, r: 3.5, fill: color, class: 'admin-chart-point' });
      const title = el('title', {});
      title.textContent = `${formatLabel(d.label, mode)}: ${formatValue(d.value)}`;
      circle.appendChild(title);
      svg.appendChild(circle);

      if (i % labelStride === 0 || i === series.length - 1) {
        const text = el('text', {
          x, y: height - padding.bottom + 20, 'text-anchor': 'middle',
          class: 'chart-axis-label',
        });
        text.textContent = formatLabel(d.label, mode);
        svg.appendChild(text);
      }
    });
  }

  container.appendChild(svg);
}
