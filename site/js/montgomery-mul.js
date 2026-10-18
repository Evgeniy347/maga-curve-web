import { MONTGOMERY_FORM } from "./forms.js";
import { MultiplicationPage } from "./page.js";
import { renderChain } from "./steps-view.js";

const page = new MultiplicationPage(document.body, MONTGOMERY_FORM);
page.onUpdate(({ curve, n, P, result }) => renderChain(document.querySelector("#steps ol"), curve, n, P, result));
page.update();
