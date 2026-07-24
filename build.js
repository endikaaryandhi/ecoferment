import tailwind from "bun-plugin-tailwind";
import { rm, cp, access } from "node:fs/promises";

await rm("./dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/index.html", "./src/guides.html"],
  outdir: "./dist",
  minify: true,
  sourcemap: "linked",
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Aset statis (PDF infografis, favicon, dsb.) tidak dilewatkan bundler.
try {
  await access("./public");
  await cp("./public", "./dist", { recursive: true });
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  console.warn("Folder ./public tidak ditemukan — aset statis dilewati.");
}

console.log(`Build selesai: ${result.outputs.length} berkas di ./dist`);