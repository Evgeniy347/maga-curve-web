export const COLORS = {
  red: "#cb4b4b",
  yellow: "#edc240",
  blue: "#afd8f8",
};

const STYLE = {
  tickColor: "rgba(84, 84, 84, 0.22)",
  borderColor: "rgba(84, 84, 84, 0.8)",
  labelColor: "#545454",
  lineWidth: 2,
  offset: { left: 34, right: 10, top: 10, bottom: 28 },
  font: "15px 'Source Sans Pro', sans-serif",
  ticksPerPixelRoot: 0.3,
};

export function tickSize(min, max, pixels) {
  const delta = (max - min) / (STYLE.ticksPerPixelRoot * Math.sqrt(pixels));
  const magnitude = 10 ** Math.floor(Math.log10(delta));
  const norm = delta / magnitude;
  if (norm < 1.5) return magnitude;
  if (norm < 2.25) return 2 * magnitude;
  if (norm < 3) return 2.5 * magnitude;
  if (norm < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

export function ticks(min, max, pixels) {
  const size = tickSize(min, max, pixels);
  const result = [];
  for (let value = Math.ceil(min / size) * size; value <= max + 1e-9; value += size) {
    result.push(Number(value.toFixed(10)));
  }
  return result;
}

export class Plot {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "plot-canvas";
    container.append(this.canvas);
    this.labels = new Map();
  }

  size() {
    return { width: this.container.clientWidth, height: this.container.clientHeight };
  }

  area() {
    const { width, height } = this.size();
    const { left, right, top, bottom } = STYLE.offset;
    return { left, top, width: width - left - right, height: height - top - bottom };
  }

  toPixel([x, y]) {
    const { range } = this;
    const area = this.area();
    return [
      area.left + ((x - range.xMin) / (range.xMax - range.xMin)) * area.width,
      area.top + ((range.yMax - y) / (range.yMax - range.yMin)) * area.height,
    ];
  }

  prepareContext() {
    const { width, height } = this.size();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const context = this.canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return context;
  }

  draw(range, series) {
    this.range = range;
    const context = this.prepareContext();
    this.drawGrid(context);
    const area = this.area();
    context.save();
    context.beginPath();
    context.rect(area.left, area.top, area.width, area.height);
    context.clip();
    for (const item of series) {
      if (item.lines) this.drawLines(context, item);
      if (item.points) this.drawPoints(context, item);
    }
    context.restore();
  }

  drawGrid(context) {
    const area = this.area();
    const { range } = this;
    context.lineWidth = 1;
    context.strokeStyle = STYLE.tickColor;
    context.fillStyle = STYLE.labelColor;
    context.font = STYLE.font;
    context.textAlign = "center";
    context.textBaseline = "top";
    for (const value of ticks(range.xMin, range.xMax, area.width)) {
      const [px] = this.toPixel([value, range.yMin]);
      this.strokeSegment(context, [px, area.top], [px, area.top + area.height]);
      context.fillText(String(value), px, area.top + area.height + 6);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (const value of ticks(range.yMin, range.yMax, area.height)) {
      const [, py] = this.toPixel([range.xMin, value]);
      this.strokeSegment(context, [area.left, py], [area.left + area.width, py]);
      context.fillText(String(value), area.left - 6, py);
    }
    context.strokeStyle = STYLE.borderColor;
    context.lineWidth = STYLE.lineWidth;
    context.strokeRect(area.left, area.top, area.width, area.height);
  }

  strokeSegment(context, [x1, y1], [x2, y2]) {
    context.beginPath();
    context.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    context.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    context.stroke();
  }

  drawLines(context, { color, data }) {
    context.strokeStyle = color;
    context.lineWidth = STYLE.lineWidth;
    context.beginPath();
    let penDown = false;
    for (const point of data) {
      if (point === null) {
        penDown = false;
        continue;
      }
      const [px, py] = this.toPixel(point);
      if (penDown) context.lineTo(px, py);
      else context.moveTo(px, py);
      penDown = true;
    }
    context.stroke();
  }

  drawPoints(context, { color, data, points }) {
    context.strokeStyle = color;
    context.fillStyle = "#ffffff";
    context.lineWidth = STYLE.lineWidth;
    for (const point of data) {
      const [px, py] = this.toPixel(point);
      context.beginPath();
      context.arc(px, py, points.radius, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }

  setLabel(name, color, point) {
    if (!this.labels.has(name)) {
      const label = document.createElement("label");
      label.className = "point-label";
      label.textContent = name;
      label.style.backgroundColor = color;
      this.container.append(label);
      this.labels.set(name, label);
    }
    const label = this.labels.get(name);
    if (!point) {
      label.style.display = "none";
      return;
    }
    const [px, py] = this.toPixel(point);
    label.style.display = "block";
    label.style.left = `${px}px`;
    label.style.top = `${py}px`;
  }
}
