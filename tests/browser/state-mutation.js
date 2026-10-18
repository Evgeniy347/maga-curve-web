window.stateMutationRun = async ({ base = "/", seed = 1, sequences = 6, steps = 8 } = {}) => {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const pick = (values) => values[Math.floor(random() * values.length)];
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));

  const FIELD = [29, 59, 97, 2, 3, 5, 15, 31, 1, 0, -7];
  const PAGES = {
    "montgomery-add.html": { kind: "fp", form: "montgomery", inputs: ["a", "b", "p", "px", "py", "qx", "qy"] },
    "modk-add.html": { kind: "fp", form: "weierstrass", inputs: ["a", "b", "p", "px", "py", "qx", "qy"] },
    "montgomery-mul.html": { kind: "fp", form: "montgomery", inputs: ["a", "b", "p", "n", "px", "py"] },
    "reals-add.html": { kind: "real", inputs: ["a", "b", "px", "py", "qx", "qy"] },
    "reals-mul.html": { kind: "real", inputs: ["a", "b", "n", "px", "py"] },
  };

  function value(page, name) {
    if (name === "p") return pick(FIELD);
    if (name === "n") return pick([0, 1, 2, 3, 5, 13, 538, -1, -3, integer(-60, 600)]);
    if (PAGES[page].kind === "real") {
      if (name === "a" || name === "b") return pick([-7, 10, -4, 1, 0, 2, -3, 3, integer(-12, 12)]);
      return pick([integer(-6, 6), (integer(-60, 60) / 10).toFixed(1), 0]);
    }
    if (name === "a" || name === "b") return pick([6, 1, 0, 2, 3, -1, 18, 14, integer(-5, 40)]);
    return integer(-3, 100);
  }

  function load(src) {
    return new Promise((resolve) => {
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:absolute;left:-10000px;top:0;width:1280px;height:900px;border:0";
      frame.onload = () => setTimeout(() => resolve(frame), 300);
      frame.src = src;
      document.body.append(frame);
    });
  }

  function errorsOf(frame) {
    const win = frame.contentWindow;
    if (!win.__mutationErrors) {
      win.__mutationErrors = [];
      win.addEventListener("error", (event) => win.__mutationErrors.push(String(event.message)));
      win.addEventListener("unhandledrejection", (event) => win.__mutationErrors.push(String(event.reason)));
    }
    return win.__mutationErrors;
  }

  function inputs(doc) {
    return Object.fromEntries([...doc.querySelectorAll("#form input")].map((input) => [input.name, input.value]));
  }

  function picture(doc) {
    const plot = doc.querySelector("#plot");
    return {
      plot: plot ? plot.innerHTML.replace(/plot-\d+/g, "plot-N") : "",
      steps: doc.querySelector("#steps")?.textContent.replace(/\s+/g, " ").trim() ?? "",
      sum: doc.querySelector(".sum-line")?.textContent.replace(/\s+/g, " ").trim() ?? "",
    };
  }

  function onFpCurve(form, values, [x, y]) {
    const p = Number(values.p);
    const mod = (v) => ((v % p) + p) % p;
    if (form === "montgomery") return mod(Number(values.b) * y * y - (x * x * x + Number(values.a) * x * x + x)) === 0;
    return mod(y * y - (x * x * x + Number(values.a) * x + Number(values.b))) === 0;
  }

  function invariants(page, doc, errors) {
    const spec = PAGES[page];
    const values = inputs(doc);
    const problems = [];
    const svg = doc.querySelector("#plot svg");
    if (!svg) problems.push("no plot svg");
    const html = svg ? svg.outerHTML : "";
    if (/NaN|Infinity|undefined/.test(html)) problems.push(`svg contains ${html.match(/NaN|Infinity|undefined/)[0]}`);
    for (const badge of doc.querySelectorAll("#plot .badge")) {
      const [, x, y] = badge.getAttribute("transform").match(/translate\(([-\d.e]+) ([-\d.e]+)\)/) ?? [];
      if (!(Number(x) >= 40 && Number(x) <= 544 && Number(y) >= 12 && Number(y) <= 516)) problems.push(`badge ${badge.textContent} outside plot at ${x},${y}`);
    }
    for (const [name, field] of Object.entries(values)) {
      if (field === "" || /NaN|undefined|Infinity/.test(field)) problems.push(`input ${name} = "${field}"`);
    }
    const p = Number(values.p);
    if (spec.kind === "fp" && !(Number.isInteger(p) && p >= 2)) problems.push(`field shows p = ${values.p}: an invalid modulus must be rejected`);
    if (values.n !== undefined && !Number.isSafeInteger(Number(values.n))) problems.push(`n = ${values.n} is not a safe integer`);
    if (spec.kind === "fp" && Number.isInteger(p) && p >= 2) {
      for (const prefix of ["p", "q"]) {
        if (values[`${prefix}x`] === undefined || doc.querySelector(`input[name=${prefix}x]`).readOnly) continue;
        const point = [Number(values[`${prefix}x`]), Number(values[`${prefix}y`])];
        const curvePoints = doc.querySelectorAll(".plot-points circle").length;
        if (curvePoints > 0 && !onFpCurve(spec.form, values, point)) problems.push(`${prefix.toUpperCase()} = (${point}) is not on the curve`);
        if (curvePoints > 0 && (point.some((c) => c < 0 || c >= p))) problems.push(`${prefix.toUpperCase()} = (${point}) outside [0, p)`);
      }
    }
    if (errors.length) problems.push(`console: ${errors.join(" | ")}`);
    return problems;
  }

  async function freshPicture(page, values, spec) {
    const query = spec.inputs.map((name) => `${name}=${encodeURIComponent(values[name])}`).join("&");
    const frame = await load(`${base}${page}?${query}`);
    const result = { picture: picture(frame.contentDocument), inputs: inputs(frame.contentDocument) };
    frame.remove();
    return result;
  }

  async function reversibility(page, spec) {
    const frame = await load(`${base}${page}`);
    const doc = frame.contentDocument;
    const before = inputs(doc);
    const curveInputs = spec.inputs.filter((name) => ["a", "b", "p"].includes(name));
    const history = [];
    for (let step = 0; step < 4; step += 1) {
      const name = pick(curveInputs);
      const next = value(page, name);
      history.push(`${name}=${next}`);
      const input = doc.querySelector(`input[name=${name}]`);
      input.value = next;
      input.dispatchEvent(new frame.contentWindow.Event("change"));
    }
    for (const name of curveInputs) {
      history.push(`${name}=${before[name]}`);
      const input = doc.querySelector(`input[name=${name}]`);
      input.value = before[name];
      input.dispatchEvent(new frame.contentWindow.Event("change"));
    }
    const after = inputs(doc);
    frame.remove();
    const moved = Object.keys(before).filter((name) => before[name] !== after[name]);
    return moved.length ? { page, history: history.join(" → "), problems: [`curve restored but ${moved.map((n) => `${n}: ${before[n]} → ${after[n]}`).join(", ")}`] } : null;
  }

  const findings = [];
  for (const [page, spec] of Object.entries(PAGES)) {
    for (let run = 0; run < sequences; run += 1) {
      const finding = await reversibility(page, spec);
      if (finding) findings.push(finding);
    }
  }
  for (const [page, spec] of Object.entries(PAGES)) {
    for (let run = 0; run < sequences; run += 1) {
      const frame = await load(`${base}${page}`);
      const doc = frame.contentDocument;
      const errors = errorsOf(frame);
      const history = [];
      for (let step = 0; step < steps; step += 1) {
        const name = pick(spec.inputs);
        const next = value(page, name);
        history.push(`${name}=${next}`);
        const input = doc.querySelector(`input[name=${name}]`);
        input.value = next;
        input.dispatchEvent(new frame.contentWindow.Event("change"));
        const problems = invariants(page, doc, errors);
        if (problems.length) {
          findings.push({ page, history: history.join(" → "), state: inputs(doc), problems });
          break;
        }
      }
      const finalValues = inputs(doc);
      const fresh = await freshPicture(page, finalValues, spec);
      const now = picture(doc);
      for (const key of ["plot", "steps", "sum"]) {
        if (fresh.picture[key] !== now[key]) {
          findings.push({ page, history: history.join(" → "), state: finalValues, problems: [`${key} differs from a fresh load of the same inputs`], freshInputs: fresh.inputs });
          break;
        }
      }
      frame.remove();
    }
  }
  return findings;
};
