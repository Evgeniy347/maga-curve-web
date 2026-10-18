const THEME_KEY = "theme";

function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function isDark(root) {
  if (root.dataset.theme) return root.dataset.theme === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

function toggleTheme(root) {
  root.dataset.theme = isDark(root) ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, root.dataset.theme);
  } catch {
    return;
  }
}

function toggleMenu(button) {
  const nav = document.getElementById(button.getAttribute("aria-controls"));
  button.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
}

if (typeof document !== "undefined") {
  const root = document.documentElement;
  const theme = storedTheme();
  if (theme) root.dataset.theme = theme;
  document.addEventListener("DOMContentLoaded", () => {
    for (const button of document.querySelectorAll("[data-theme-toggle]")) {
      button.addEventListener("click", () => toggleTheme(root));
    }
    for (const button of document.querySelectorAll("[data-menu-toggle]")) {
      button.addEventListener("click", () => toggleMenu(button));
    }
  });
}
