const chart = document.getElementById('chart');
const markers = document.getElementById('axis-markers');
const labels = {salary: '每月薪金', saving: '每月可儲蓄'};
const money = new Intl.NumberFormat('zh-HK', {maximumFractionDigits: 2});
const ns = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes, text) {
  const el = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function readAmount(key) {
  const input = document.getElementById(key + '-input');
  const value = input.valueAsNumber;
  const invalid = input.validity.badInput || (input.value !== '' && (!Number.isFinite(value) || value < 0 || value > 999999999.99));
  document.getElementById(key + '-error').textContent = invalid ? '請輸入 0 至 999,999,999.99 的金額。' : '';
  input.setAttribute('aria-invalid', String(invalid));
  return invalid || input.value === '' ? null : value;
}
function update() {
  const values = {salary: readAmount('salary'), saving: readAmount('saving')};
  const scale = Math.max(values.salary || 0, values.saving || 0, 1);
  const entries = [];
  markers.replaceChildren();
  for (const key of ['salary', 'saving']) {
    // Translate the complete curve: its shape, slopes and plateau never change.
    const offset = values[key] === null ? 0 : values[key] / scale * 80;
    document.getElementById(key + '-group').setAttribute('transform', `translate(0 ${-offset})`);
    if (values[key] !== null) entries.push({key, amount: values[key], y: 440 - offset});
  }
  if (document.getElementById("cross-arrows")) updateArrows();
  entries.sort((a, b) => a.y - b.y);
  const close = entries.length === 2 && entries[1].y - entries[0].y < 48;
  entries.forEach((entry, i) => {
    const labelY = close ? (entries[0].y + entries[1].y) / 2 + (i === 0 ? -27 : 27) : entry.y;
    const group = svgElement('g', {'data-marker': entry.key});
    group.append(svgElement('path', {d: `M190 ${labelY} L213 ${entry.y} H238`, fill: 'none', stroke: '#7f8176', 'stroke-width': 1.5}));
    group.append(svgElement('circle', {cx: 230, cy: entry.y, r: 4, fill: '#252722'}));
    group.append(svgElement('text', {x: 180, y: labelY - 9, 'text-anchor': 'end', 'font-size': 13, fill: '#65665b'}, labels[entry.key]));
    group.append(svgElement('text', {x: 180, y: labelY + 13, 'text-anchor': 'end', 'font-size': 18, fill: '#252722'}, `HK$ ${money.format(entry.amount)}`));
    markers.append(group);
  });
  document.getElementById('chart-desc').textContent = entries.length
    ? entries.map(e => `${labels[e.key]} HK$ ${money.format(e.amount)}`).join('；') + '。金額標示於左側各線起點。薪金先上升後持平，儲蓄直線上升，保費線大致水平、尾段微微向上，線形保持不變，後續走勢只作示意。'
    : '請輸入每月薪金及每月可儲蓄金額，金額將標示於左側各線起點。保費線大致水平、尾段微微向上。';
}
for (const key of ['salary', 'saving']) document.getElementById(key + '-input').addEventListener('input', update);
document.getElementById('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(chart)], {type: 'image/svg+xml;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = '人生薪金與儲蓄走勢.svg';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
update();

// Nest crosses inside their curve groups so the existing input-driven translation
// moves each cross and its line together, without changing either curve's shape.
const crossSpecs = [
  {name: '大交叉', parent: 'salary-group', x: 870, y: 220, radius: 18, width: 6},
  {name: '中交叉', parent: 'saving-group', x: 620, y: 440 - (620 - 230) * 336 / 720, radius: 12, width: 4.5},
  {name: '小交叉', parent: 'saving-group', x: 435, y: 440 - (435 - 230) * 336 / 720, radius: 7, width: 3}
];
const crosses = crossSpecs.map(spec => {
  const g = svgElement('g', {'data-cross': spec.name, transform: `translate(${spec.x} ${spec.y})`, display: 'none', role: 'img', 'aria-label': spec.name, 'aria-hidden': 'true'});
  const r = spec.radius;
  g.append(svgElement('path', {d: `M${-r} ${-r} L${r} ${r} M${-r} ${r} L${r} ${-r}`, stroke: '#c13e3a', 'stroke-width': spec.width, 'stroke-linecap': 'round', fill: 'none'}));
  document.getElementById(spec.parent).append(g);
  return g;
});
const crossButton = document.getElementById('toggle-crosses');
crossButton.addEventListener('click', () => {
  const show = crossButton.getAttribute('aria-pressed') !== 'true';
  crossButton.setAttribute('aria-pressed', String(show));
  arrowGroup.setAttribute('display', show ? 'inline' : 'none');
  updateArrows();
  document.getElementById('cross-toggle-label').textContent = show ? '隱藏紅色交叉' : '顯示紅色交叉';
  for (const cross of crosses) {
    cross.setAttribute('display', show ? 'inline' : 'none');
    cross.setAttribute('aria-hidden', String(!show));
  }
});

const arrowGroup = svgElement('g', {id: 'cross-arrows', display: 'none', 'aria-hidden': 'true'});
chart.append(arrowGroup);
function updateArrows() {
  arrowGroup.replaceChildren();
  for (const [i, spec] of crossSpecs.entries()) {
    const transform = document.getElementById(spec.parent).getAttribute('transform') || 'translate(0 0)';
    const offset = Number(transform.match(/translate\(0\s+([-\d.]+)/)?.[1] || 0);
    const start = spec.y + offset;
    const end = i === 0 ? 440 : i === 1 ? 490 : start + 38;
    arrowGroup.append(svgElement('path', {d: `M${spec.x} ${start} V${end}`, stroke: '#c13e3a', 'stroke-width': 2.5, fill: 'none'}));
    for (const tip of (i === 1 ? [440, end] : [end])) {
      arrowGroup.append(svgElement('path', {d: `M${spec.x-6} ${tip-10} L${spec.x} ${tip} L${spec.x+6} ${tip-10}`, stroke: '#c13e3a', 'stroke-width': 2.5, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}));
    }
  }
}
updateArrows();

const dreams = [];
const dreamForm = document.getElementById('dream-form');
function renderDreams() {
 const list = document.getElementById('dream-list'); list.replaceChildren();
 dreams.forEach((dream, index) => {
  const li = document.createElement('li'); const label = document.createElement('span'); label.textContent = dream;
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', '刪除目標：' + dream);
  remove.addEventListener('click', () => {dreams.splice(index, 1); renderDreams();}); li.append(label, remove); list.append(li);
 });
 dreamForm.hidden = dreams.length >= 3;
 document.getElementById('dream-count').textContent = dreams.length + ' / 3 項';
}
dreamForm.addEventListener('submit', event => {
 event.preventDefault(); const input = document.getElementById('dream-input'); const value = input.value.trim();
 if (!value || dreams.length >= 3) return;
 dreams.push(value); input.value = ''; renderDreams();
});

const labelButton = document.getElementById('toggle-labels');
const coverageLabels = crossSpecs.map((spec, index) => {
 const label = svgElement('text', {x: spec.x + spec.radius + 10, y: spec.y - (index === 0 ? 12 : 32), 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': 4, 'stroke-linejoin': 'round', fill: '#c13e3a', 'font-size': 18, 'font-weight': 600, display: 'none'}, ['危疾', '醫療', '意外'][index]);
 document.getElementById(spec.parent).append(label);
 return label;
});
labelButton.addEventListener('click', () => {
 const show = labelButton.getAttribute('aria-pressed') !== 'true';
 labelButton.setAttribute('aria-pressed', String(show));
 labelButton.textContent = show ? '隱藏保障標籤' : '顯示保障標籤';
 coverageLabels.forEach(label => label.setAttribute('display', show ? 'inline' : 'none'));
});
crossButton.addEventListener('click', () => {
 const shown = crossButton.getAttribute('aria-pressed') === 'true';
 labelButton.disabled = !shown;
 if (!shown) {
  labelButton.setAttribute('aria-pressed', 'false'); labelButton.textContent = '顯示保障標籤';
  coverageLabels.forEach(label => label.setAttribute('display', 'none'));
 }
});
