const SVG_NS = "http://www.w3.org/2000/svg";

const LAYOUT = {
  view: 560,
  left: 44,
  top: 16,
  size: 496,
  padding: 0.6,
  tickGap: 22,
  tickLabelGap: 10,
  badgeRadius: 13,
  thirdRadius: 8,
  ticksPerPixelRoot: 0.3,
};

const POINT_RADIUS = { max: 3.6, min: 1.2, budget: 104 };

export function tickSize(min, max, pixels) {
  const delta = (max - min) / (LAYOUT.ticksPerPixelRoot * Math.sqrt(pixels));
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
    result.push(Number(value.toFixed(10)) || 0);
  }
  return result;
}

export function plotRange(p) {
  return { xMin: -LAYOUT.padding, xMax: p - 1 + LAYOUT.padding, yMin: -LAYOUT.padding, yMax: p - 1 + LAYOUT.padding };
}

export function pointRadius(p) {
  return Math.min(POINT_RADIUS.max, Math.max(POINT_RADIUS.min, POINT_RADIUS.budget / p));
}

export function segments(polyline) {
  const result = [[]];
  for (const point of polyline) {
    if (point === null) result.push([]);
    else result.at(-1).push(point);
  }
  return result.filter((segment) => segment.length > 1);
}

function element(tag, attributes = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  node.append(...children);
  return node;
}

function title(text) {
  return element("title", {}, [text]);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function tickLabel(value) {
  return value < 0 ? `−${-value}` : String(value);
}

function coordinate(value) {
  return String(Math.round(value * 1e5) / 1e5);
}

let instances = 0;

export class Plot {
  constructor(container) {
    instances += 1;
    this.id = `plot-${instances}`;
    this.container = container;
  }

  toPixel([x, y]) {
    const { range } = this;
    const { left, top, size } = LAYOUT;
    return [
      round(left + ((x - range.xMin) / (range.xMax - range.xMin)) * size),
      round(top + ((range.yMax - y) / (range.yMax - range.yMin)) * size),
    ];
  }

  render({ range, points = [], pointRadius: radius = POINT_RADIUS.max, highlights = [], curveLines = [], chord = [], badges = [], R = null, third = null, caption, description }) {
    this.range = range;
    const { view, left, top, size } = LAYOUT;
    const clip = `${this.id}-clip`;
    const svg = element("svg", {
      class: "plot-svg",
      viewBox: `0 0 ${view} ${view}`,
      role: "img",
      "aria-labelledby": `${this.id}-t ${this.id}-d`,
    }, [
      element("title", { id: `${this.id}-t` }, [caption]),
      element("desc", { id: `${this.id}-d` }, [description]),
      element("defs", {}, [element("clipPath", { id: clip }, [element("rect", { x: left, y: top, width: size, height: size })])]),
      element("rect", { class: "plot-bg", x: left, y: top, width: size, height: size, rx: 4 }),
      this.grid(),
      element("g", { "clip-path": `url(#${clip})` }, [
        this.polylines("plot-curve", curveLines),
        this.polylines("plot-chord", [chord]),
        this.reflection(R, third),
        this.curvePoints(points, radius),
        this.highlightRings(highlights, radius),
        this.thirdPoint(R, third),
      ]),
      ...badges.map(({ name, role, point }) => this.badge(name, role, point)),
    ]);
    this.container.replaceChildren(svg);
  }

  grid() {
    const { left, top, size, tickGap, tickLabelGap } = LAYOUT;
    const { range } = this;
    const lines = [];
    const labels = [];
    for (const value of ticks(range.xMin, range.xMax, size)) {
      const [x] = this.toPixel([value, range.yMin]);
      lines.push(element("line", { x1: x, y1: top, x2: x, y2: top + size }));
      labels.push(element("text", { x, y: top + size + tickGap, "text-anchor": "middle" }, [tickLabel(value)]));
    }
    for (const value of ticks(range.yMin, range.yMax, size)) {
      const [, y] = this.toPixel([range.xMin, value]);
      lines.push(element("line", { x1: left, y1: y, x2: left + size, y2: y }));
      labels.push(element("text", { x: left - tickLabelGap, y: y + 4, "text-anchor": "end" }, [tickLabel(value)]));
    }
    return element("g", {}, [element("g", { class: "plot-grid" }, lines), element("g", { class: "plot-ticks" }, labels)]);
  }

  polylines(className, polylines) {
    const paths = polylines.flatMap(segments).map((segment) => {
      const d = segment.map((point, i) => `${i === 0 ? "M" : "L"}${this.toPixel(point).join(" ")}`).join("");
      return element("path", { d });
    });
    return element("g", { class: className }, paths);
  }

  curvePoints(points, radius) {
    const circles = points.map((point) => {
      const [cx, cy] = this.toPixel(point);
      return element("circle", { cx, cy, r: radius }, [title(`(${coordinate(point[0])}, ${coordinate(point[1])})`)]);
    });
    return element("g", { class: "plot-points" }, circles);
  }

  highlightRings(points, radius) {
    const rings = points.map((point) => {
      const [cx, cy] = this.toPixel(point);
      return element("circle", { cx, cy, r: radius + 3.5 }, [title(`(${coordinate(point[0])}, ${coordinate(point[1])})`)]);
    });
    return element("g", { class: "plot-subgroup" }, rings);
  }

  reflection(R, third) {
    if (!R || !third || R[1] === third[1]) return element("g");
    const [x1, y1] = this.toPixel(third);
    const [x2, y2] = this.toPixel(R);
    return element("line", { class: "plot-reflect", x1, y1, x2, y2 });
  }

  thirdPoint(R, third) {
    if (!R || !third || R[1] === third[1]) return element("g");
    const [x, y] = this.toPixel(third);
    return element("g", { class: "plot-third", transform: `translate(${x} ${y})` }, [
      element("circle", { r: LAYOUT.thirdRadius }),
      element("text", { x: 12, y: -8 }, ["−R"]),
      title(`−R = (${coordinate(third[0])}, ${coordinate(third[1])}) — третья точка на прямой`),
    ]);
  }

  badge(name, role, point) {
    if (!point) return element("g");
    const [x, y] = this.toPixel(point);
    return element("g", { class: `badge ${role}`, transform: `translate(${x} ${y})` }, [
      element("circle", { r: LAYOUT.badgeRadius }),
      element("text", { y: 4.5, "text-anchor": "middle" }, [name]),
      title(`${name} = (${coordinate(point[0])}, ${coordinate(point[1])})`),
    ]);
  }
}
