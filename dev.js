import index from "./src/index.html";
import guides from "./src/guides.html";
import { resolve, sep } from "node:path";

const PUBLIC = resolve(import.meta.dir, "public");
const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  development: true,
  routes: {
    "/": index,
    "/index.html": index,
    "/guides": guides,
    "/guides.html": guides,
  },
  async fetch(req) {
    // Layani aset statis dari ./public selama pengembangan.
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const target = resolve(PUBLIC, "." + pathname);
    if (target !== PUBLIC && !target.startsWith(PUBLIC + sep)) {
      return new Response("Forbidden", { status: 403 });
    }

    const asset = Bun.file(target);
    return (await asset.exists())
      ? new Response(asset)
      : new Response("Not Found", { status: 404 });
  },
});

console.log(`Dev server: http://localhost:${server.port}`);