import { resolve, sep } from "node:path";
import { existsSync } from "node:fs";

const DIST = resolve(import.meta.dir, "dist");
const port = Number(process.env.PORT) || 3000;

// Fail-fast: lebih baik berhenti dengan pesan jelas daripada 500 di setiap request.
if (!existsSync(resolve(DIST, "index.html"))) {
  console.error("Folder ./dist belum ada atau kosong. Jalankan `bun run build` terlebih dahulu.");
  process.exit(1);
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "object-src 'self'",
    "frame-src 'self'",
    "base-uri 'none'",
  ].join("; "),
};

const notFoundPage = Bun.file(resolve(DIST, "index.html"));

function isInside(target) {
  return target === DIST || target.startsWith(DIST + sep);
}

const server = Bun.serve({
  port,
  async fetch(req) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const requested = pathname === "/" ? "/index.html" : pathname;
    const target = resolve(DIST, "." + requested);

    if (!isInside(target)) return new Response("Forbidden", { status: 403 });

    for (const candidate of [target, `${target}.html`]) {
      const asset = Bun.file(candidate);
      if (await asset.exists()) {
        return new Response(asset, { headers: SECURITY_HEADERS });
      }
    }

    // Fallback aman: cek dulu, jangan asumsikan berkasnya ada.
    if (await notFoundPage.exists()) {
      return new Response(notFoundPage, {
        status: 404,
        headers: { ...SECURITY_HEADERS, "Content-Type": "text/html" },
      });
    }
    return new Response("Not Found", { status: 404, headers: SECURITY_HEADERS });
  },
  error(err) {
    console.error("[serve] kesalahan internal:", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`EcoFerment berjalan di http://localhost:${server.port}`);