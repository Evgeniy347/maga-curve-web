class FakeNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.children = [];
    this.attributes = {};
    this.style = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
    if (name === "class") this.className = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  get textContent() {
    return this.children.map((child) => (typeof child === "string" ? child : child.textContent)).join("");
  }

  findAll(predicate) {
    const own = predicate(this) ? [this] : [];
    return own.concat(this.children.filter((child) => typeof child !== "string").flatMap((child) => child.findAll(predicate)));
  }

  byClass(name) {
    return this.findAll((node) => node.className.split(" ").includes(name));
  }
}

export function installFakeDocument() {
  globalThis.document = {
    createElement: (tag) => new FakeNode(tag),
    createElementNS: (namespace, tag) => new FakeNode(tag),
  };
  return (tag = "ol") => new FakeNode(tag);
}
