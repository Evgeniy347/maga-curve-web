import { WEIERSTRASS_FORM } from "./forms.js";
import { AdditionPage } from "./page.js";
import { renderSteps } from "./steps-view.js";

const page = new AdditionPage(document.body, WEIERSTRASS_FORM);
page.onUpdate(({ curve, P, Q }) => renderSteps(document.querySelector("#steps ol"), curve, P, Q, WEIERSTRASS_FORM.names));
page.update();
