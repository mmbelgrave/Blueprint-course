/*
 * Measure every result sheet against A4.
 *
 * This is where the numbers in changePlanLayout and orderLayout come
 * from (review round 7, R7-5). It prints, for each sheet: the body box, the
 * height of what is in it, and whether the sheet is over A4's 1123px. With
 * BLOCKS=1 it also prints every block of every sheet, which is how a wrong
 * constant is found.
 *
 *   cd web && node scripts/preview-mode.cjs            (serves on 3001)
 *   node design/screenshots/sample-b-answers.mjs <somewhere>/sam.json
 *   node design/screenshots/measure-sheets.mjs <somewhere>/sam.json
 *   BLOCKS=1 node design/screenshots/measure-sheets.mjs <somewhere>/sam.json /step/3/print
 *
 * Chrome does the measuring, over its own debugging protocol, so there is
 * nothing to install. The plumbing is print-results.mjs's.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [answersPath, ...urls] = process.argv.slice(2);
const PAGES = urls.length ? urls : ["/step/1/print", "/step/2/print", "/step/3/print", "/phase/1/print"];
const APP = process.env.PREVIEW_URL ?? "http://localhost:3001";
const PORT = 9334;
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((p) => {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
});
if (!CHROME) throw new Error("no Chrome found");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = join(tmpdir(), `measure-${Date.now()}`);
const child = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1280,1400",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
  } catch {
    /* not up yet */
  }
  await sleep(200);
}
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok, bad) => {
  socket.onopen = ok;
  socket.onerror = bad;
});
let id = 0;
const waiting = new Map();
socket.onmessage = (e) => {
  const m = JSON.parse(e.data);
  const p = waiting.get(m.id);
  if (p) {
    waiting.delete(m.id);
    m.error ? p.bad(new Error(m.error.message)) : p.ok(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((ok, bad) => {
    waiting.set(++id, { ok, bad });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
async function open(url) {
  await send("Page.navigate", { url });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (
      await evaluate(
        "document.readyState === 'complete' && document.fonts.status === 'loaded' && !!document.querySelector('[class*=\"210mm\"]')",
      )
    )
      break;
  }
  await sleep(1200);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  const answers = readFileSync(answersPath, "utf8");
  await open(`${APP}/privacy`);
  await evaluate(`localStorage.setItem("blueprint-preview-v1", ${JSON.stringify(answers)}), 1`);

  for (const page of PAGES) {
    await open(`${APP}${page}`);
    const sheets = await evaluate(`(() => {
      const A4 = 1123;
      return [...document.querySelectorAll('[class*="210mm"]')].map((s, i) => {
        const head = s.querySelector('h1, h2');
        const foot = s.querySelector('footer');
        const headEl = s.querySelector('header');
        const body = s.querySelector('div.flex-1') ?? s;
        const blocks = [...body.children].map((b) => ({
          h: b.offsetHeight,
          text: (b.innerText || "").replace(/\\s+/g, " ").slice(0, 46),
          chars: (b.innerText || "").length,
        }));
        const kids=[...body.children];
        const first=kids[0], last=kids[kids.length-1];
        const content = first && last ? (last.offsetTop + last.offsetHeight) - first.offsetTop : 0;
        return {
          page: i + 1,
          height: s.offsetHeight,
          over: s.offsetHeight - A4,
          bodyH: body.offsetHeight,
          content,
          foot: (foot?.innerText || '').replace(/s+/g, ' ').slice(-12),
          title: (head?.innerText || "").replace(/\\s+/g, " ").slice(0, 44),
          blocks,
        };
      });
    })()`);
    console.log(`\n${page}`);
    for (const s of sheets) {
      console.log(
        `  sheet ${s.page}: body ${s.bodyH} content ${s.content} | ${s.height}px ${s.over > 0 ? `OVER by ${s.over}` : "fits"}  ${s.foot}  ${s.title}`,
      );
      if (s.over > 0 || process.env.BLOCKS) {
        for (const b of s.blocks) console.log(`      ${String(b.h).padStart(5)}px  ${b.chars} chars  ${b.text}`);
      }
    }
  }
} finally {
  try {
    socket.close();
  } catch {
    /* gone */
  }
  child.kill();
}
