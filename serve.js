import { join, normalize, resolve } from "node:path";

const DIST = resolve(import.meta.dir, "dist");
const port = Number(process.env.PORT) || 3000;
const fallback = Bun.file(join(DIST, "index.html"));

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const requested = pathname === "/" ? "/index.html" : pathname;
    const target = resolve(DIST, "." + normalize(requested));

    if (!target.startsWith(DIST)) {
      return new Response("Forbidden", { status: 403 });
    }

    const asset = Bun.file(target);
    if (await asset.exists()) {
      return new Response(asset);
    }
    return new Response(fallback, { headers: { "Content-Type": "text/html" } });
  },
});

console.log(`EcoFerment berjalan di http://localhost:${server.port}`);
