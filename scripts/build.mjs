import { cp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../", import.meta.url),
  dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("public/", root), dist, { recursive: true });
const design = await readFile(new URL("DESIGN.md", root), "utf8");
const colors = design.match(/\ncolors:\n([\s\S]*?)\ntypography:/)?.[1];
if (!colors) throw Error("Missing design color tokens");
const pairs = [...colors.matchAll(/^  ([\w-]+): "(#[\da-fA-F]{6})"$/gm)];
await writeFile(
  new URL("tokens.css", dist),
  `:root {\n${pairs.map(([, k, v]) => `  --color-${k}: ${v};`).join("\n")}\n}\n`,
);
for (const [name, size] of [
  ["favicon.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
])
  await sharp(new URL("public/assets/logo.svg", root).pathname)
    .resize(size, size)
    .png()
    .toFile(new URL(`assets/${name}`, dist).pathname);
await writeFile(new URL(".nojekyll", dist), "");
console.log("Built static app into dist/");
