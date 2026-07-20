const el = {
  input: document.getElementById("fruitWeight"),
  error: document.getElementById("inputError"),
  results: document.getElementById("resultsSection"),
  fruit: document.getElementById("resFruit"),
  sugar: document.getElementById("resSugar"),
  water: document.getElementById("resWater"),
  calc: document.getElementById("calcBtn"),
  reset: document.getElementById("resetBtn"),
};

const RATIO = { fruit: 3, sugar: 1, water: 10 };
const MAX_WEIGHT = 1_000_000;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const format = (value, decimals) =>
  value.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function parseWeight(raw) {
  const value = Number.parseFloat(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(value)) return { ok: false, message: "Masukkan berat buah terlebih dahulu." };
  if (value <= 0) return { ok: false, message: "Berat buah harus lebih besar dari 0 gram." };
  if (value > MAX_WEIGHT) return { ok: false, message: "Berat buah terlalu besar. Gunakan nilai di bawah 1.000.000 gram." };
  return { ok: true, value };
}

function computeRecipe(fruitWeight) {
  const unit = fruitWeight / RATIO.fruit;
  return {
    fruit: fruitWeight,
    sugar: unit * RATIO.sugar,
    water: (unit * RATIO.water) / 1000,
  };
}

function animateValue(node, target, decimals) {
  if (prefersReducedMotion) {
    node.textContent = format(target, decimals);
    return;
  }
  const duration = 450;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = format(target * eased, decimals);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showError(message) {
  el.error.textContent = message;
  el.error.classList.remove("hidden");
  el.input.setAttribute("aria-invalid", "true");
}

function clearError() {
  el.error.textContent = "";
  el.error.classList.add("hidden");
  el.input.removeAttribute("aria-invalid");
}

function setResultsActive(active) {
  el.results.classList.toggle("opacity-50", !active);
  el.results.classList.toggle("pointer-events-none", !active);
}

function calculate() {
  const parsed = parseWeight(el.input.value);
  if (!parsed.ok) {
    showError(parsed.message);
    setResultsActive(false);
    el.input.focus();
    return;
  }
  clearError();
  const recipe = computeRecipe(parsed.value);
  animateValue(el.fruit, recipe.fruit, 0);
  animateValue(el.sugar, recipe.sugar, 0);
  animateValue(el.water, recipe.water, 2);
  setResultsActive(true);
}

function reset() {
  el.input.value = "";
  clearError();
  el.fruit.textContent = "0";
  el.sugar.textContent = "0";
  el.water.textContent = "0";
  setResultsActive(false);
  el.input.focus();
}

el.calc.addEventListener("click", calculate);
el.reset.addEventListener("click", reset);
el.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") calculate();
});
el.input.addEventListener("input", () => {
  if (el.input.value.trim() !== "") clearError();
});
