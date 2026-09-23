// Copies the single sources of content (../step1-content.json, ../step2-content.json)
// into the app. Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

for (const name of ["step1-content.json", "step2-content.json"]) {
  const source = new URL(`../../${name}`, import.meta.url);
  const target = new URL(`../src/content/${name}`, import.meta.url);
  if (!existsSync(source)) {
    console.warn(`sync-content: ../${name} not found, keeping the existing copy.`);
    continue;
  }
  mkdirSync(new URL(".", target), { recursive: true });
  copyFileSync(source, target);
  console.log(`sync-content: ${name} copied.`);
}
