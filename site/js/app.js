import { MONTGOMERY_FORM, REAL_MONTGOMERY_FORM, REAL_WEIERSTRASS_FORM, WEIERSTRASS_FORM } from "./forms.js";
import { AdditionPage, MultiplicationPage } from "./page.js";
import { RealAdditionPage, RealMultiplicationPage } from "./reals-page.js";
import { renderChain, renderSteps } from "./steps-view.js";

const FIELD_FORMS = { montgomery: MONTGOMERY_FORM, weierstrass: WEIERSTRASS_FORM };
const REAL_FORMS = { montgomery: REAL_MONTGOMERY_FORM, weierstrass: REAL_WEIERSTRASS_FORM };
const steps = () => document.querySelector("#steps ol");

const OPERATIONS = {
  add: (form) => {
    const page = new AdditionPage(document.body, FIELD_FORMS[form]);
    page.onUpdate(({ curve, P, Q }) => renderSteps(steps(), curve, P, Q, FIELD_FORMS[form].names));
    return page;
  },
  mul: (form) => {
    const page = new MultiplicationPage(document.body, FIELD_FORMS[form]);
    page.onUpdate(({ curve, n, P, result }) => renderChain(steps(), curve, n, P, result));
    return page;
  },
  "reals-add": (form) => new RealAdditionPage(document.body, REAL_FORMS[form]),
  "reals-mul": (form) => new RealMultiplicationPage(document.body, REAL_FORMS[form]),
};

const { form, op } = document.querySelector("main").dataset;
OPERATIONS[op](form).update();
