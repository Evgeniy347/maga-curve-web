import { montgomery } from "./curve.js";
import { THESIS_CURVE, THESIS_SUM } from "./forms.js";
import { buildScene } from "./page.js";
import { Plot } from "./plot.js";

const { scene } = buildScene(montgomery(THESIS_CURVE), THESIS_SUM.P, THESIS_SUM.Q);
new Plot(document.querySelector("#hero-plot")).render(scene);
