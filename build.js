import tailwind from "bun-plugin-tailwind";
import { rm } from "node:fs/promises";

await rm("./dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  minify: true,
  sourcemap: "linked",
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(`Build selesai: ${result.outputs.length} berkas di ./dist`);
