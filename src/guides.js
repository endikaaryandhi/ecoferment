/**
 * Viewer PDF berbasis peramban (tanpa dependensi eksternal).
 *
 * Alur: verifikasi aset (HEAD) -> deteksi dukungan viewer -> mount <iframe>
 *       -> timeout guard -> state ready | unsupported | error.
 */

const SETTINGS = {
  zoomSteps: [50, 75, 100, 125, 150, 200, 300],
  defaultZoom: 100,
  probeTimeoutMs: 6000,   // batas verifikasi HEAD
  loadTimeoutMs: 12000,   // batas tunggu iframe 'load'
};

const root = document.querySelector("[data-pdf-viewer]");

if (root) {
  initViewer(root).catch((err) => {
    console.error("[guides] inisialisasi viewer gagal:", err);
  });
}

async function initViewer(container) {
  const el = {
    stage: container.querySelector("[data-pdf-stage]"),
    loading: container.querySelector("[data-pdf-loading]"),
    fallback: container.querySelector("[data-pdf-fallback]"),
    error: container.querySelector("[data-pdf-error]"),
    errorDetail: container.querySelector("[data-pdf-error-detail]"),
    retry: container.querySelector("[data-pdf-retry]"),
    zoomIn: container.querySelector("[data-pdf-zoom-in]"),
    zoomOut: container.querySelector("[data-pdf-zoom-out]"),
    zoomLabel: container.querySelector("[data-pdf-zoom-label]"),
    fullscreen: container.querySelector("[data-pdf-fullscreen]"),
    downloads: container.querySelectorAll("[data-pdf-download]"),
    open: container.querySelector("[data-pdf-open]"),
  };

  const rawSrc = container.dataset.pdfSrc?.trim();
  if (!rawSrc) {
    showError(el, "Atribut data-pdf-src belum diisi.");
    return;
  }

  // Resolusi ke URL absolut + penolakan skema non-http agar tidak jadi vektor injeksi.
  let assetUrl;
  try {
    assetUrl = new URL(rawSrc, window.location.href);
    if (!/^https?:$/.test(assetUrl.protocol)) throw new Error("skema tidak diizinkan");
  } catch {
    showError(el, "Alamat dokumen tidak valid.");
    return;
  }

  const fileName = decodeURIComponent(assetUrl.pathname.split("/").pop() || "panduan.pdf");
  el.downloads.forEach((a) => {
    a.href = assetUrl.href;
    a.setAttribute("download", fileName);
  });
  if (el.open) el.open.href = assetUrl.href;

  let zoom = SETTINGS.defaultZoom;
  let frame = null;

  await render();

  // ---------- alur utama ----------

  async function render() {
    setState(el, "loading");
    destroyFrame();

    const probe = await probeAsset(assetUrl.href);
    if (!probe.ok) {
      showError(el, probe.message);
      return;
    }

    // navigator.pdfViewerEnabled: Chrome 94+, Firefox 96+, Safari 16.4+.
    // undefined => peramban lama, tetap dicoba embed (fallback ditangani timeout).
    if (navigator.pdfViewerEnabled === false) {
      setState(el, "unsupported");
      toggleControls(el, false);
      return;
    }

    mountFrame();
  }

  function mountFrame() {
    frame = document.createElement("iframe");
    frame.className = "absolute inset-0 w-full h-full border-0";
    frame.title = container.dataset.pdfTitle || "Dokumen PDF";
    frame.setAttribute("loading", "lazy");
    frame.setAttribute("referrerpolicy", "same-origin");
    frame.src = buildSrc(assetUrl.href, zoom);

    const timer = window.setTimeout(() => {
      // 'load' tak kunjung datang: umumnya viewer internal diblokir kebijakan perangkat.
      setState(el, "unsupported");
      toggleControls(el, false);
      destroyFrame();
    }, SETTINGS.loadTimeoutMs);

    frame.addEventListener("load", () => {
      window.clearTimeout(timer);
      setState(el, "ready");
      toggleControls(el, true);
    }, { once: true });

    frame.addEventListener("error", () => {
      window.clearTimeout(timer);
      showError(el, "Peramban menolak menampilkan dokumen.");
    }, { once: true });

    el.stage.appendChild(frame);
  }

  function destroyFrame() {
    if (frame?.isConnected) frame.remove();
    frame = null;
  }

  function applyZoom(direction) {
    const steps = SETTINGS.zoomSteps;
    const idx = steps.indexOf(zoom);
    const next = steps[clamp(idx + direction, 0, steps.length - 1)];
    if (next === zoom) return;

    zoom = next;
    el.zoomLabel.textContent = `${zoom}%`;
    el.zoomOut.disabled = zoom === steps[0];
    el.zoomIn.disabled = zoom === steps[steps.length - 1];

    // Viewer bawaan hanya membaca parameter fragmen saat dokumen dimuat,
    // jadi src di-set ulang. Posisi gulir memang ikut ter-reset.
    if (frame) frame.src = buildSrc(assetUrl.href, zoom);
  }

  // ---------- event ----------

  el.zoomIn?.addEventListener("click", () => applyZoom(1));
  el.zoomOut?.addEventListener("click", () => applyZoom(-1));
  el.retry?.addEventListener("click", () => void render());

  el.fullscreen?.addEventListener("click", async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (typeof el.stage.requestFullscreen === "function") {
      try {
        await el.stage.requestFullscreen({ navigationUI: "hide" });
        return;
      } catch { /* jatuh ke tab baru */ }
    }
    // iOS Safari tidak mengizinkan fullscreen pada elemen non-media.
    window.open(assetUrl.href, "_blank", "noopener");
  });

  document.addEventListener("fullscreenchange", () => {
    const icon = el.fullscreen?.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = document.fullscreenElement ? "fullscreen_exit" : "fullscreen";
  });

  // Pintasan papan ketik: +/- untuk zoom, Escape ditangani peramban.
  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
    if (e.key === "+" || e.key === "=") applyZoom(1);
    if (e.key === "-" || e.key === "_") applyZoom(-1);
  });
}

// ---------- util ----------

function buildSrc(href, zoom) {
  // Parameter fragmen PDF Open Parameters (Adobe). Didukung Chrome/Edge/Firefox.
  return `${href}#toolbar=1&navpanes=0&statusbar=0&view=FitH&zoom=${zoom}`;
}

async function probeAsset(href) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), SETTINGS.probeTimeoutMs);

  try {
    const res = await fetch(href, { method: "HEAD", signal: ctrl.signal, cache: "no-cache" });

    if (res.status === 404) return { ok: false, message: "Berkas PDF tidak ditemukan di server. Pastikan sudah diletakkan di folder public/." };
    if (!res.ok) return { ok: false, message: `Server membalas status ${res.status}.` };

    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("application/pdf") && !type.includes("octet-stream")) {
      return { ok: false, message: `Tipe konten tidak sesuai (${type}). Periksa konfigurasi server.` };
    }
    return { ok: true };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, message: "Permintaan melebihi batas waktu. Periksa koneksi jaringan." };
    return { ok: false, message: "Dokumen tidak dapat dijangkau." };
  } finally {
    window.clearTimeout(timer);
  }
}

function setState(el, state) {
  el.loading.hidden = state !== "loading";
  el.fallback.hidden = state !== "unsupported";
  el.error.hidden = state !== "error";
}

function showError(el, message) {
  el.errorDetail.textContent = message;
  setState(el, "error");
  toggleControls(el, false);
}

function toggleControls(el, enabled) {
  [el.zoomIn, el.zoomOut, el.fullscreen].forEach((btn) => {
    if (btn) btn.disabled = !enabled;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}