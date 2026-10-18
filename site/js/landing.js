import { montgomery } from "./curve.js";
import { buildScene } from "./page.js";
import { Plot } from "./plot.js";

export const THESIS_CURVE = { A: 6, B: 1, p: 29 };
export const THESIS_SUM = { P: [2, 11], Q: [7, 8] };

if (typeof document !== "undefined") {
  const curve = montgomery(THESIS_CURVE);
  const { scene } = buildScene(curve, THESIS_SUM.P, THESIS_SUM.Q);
  new Plot(document.querySelector("#hero-plot")).render(scene);
}
