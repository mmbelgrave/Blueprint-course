/*
 * The terms, as a dated PDF, for the purchase confirmation.
 *
 * A buyer has to be given the terms on a durable medium, in the version that
 * applied on the day they bought (lawyer, 24 October). A link is not durable:
 * the page changes. So every version is printed once, kept beside the others
 * under web/public/terms, and the confirmation attaches the one that was in
 * force on the purchase date.
 *
 *   node scripts/print-terms.cjs                      prints today's version
 *   node scripts/print-terms.cjs 2026-10-24           names the date yourself
 *   node scripts/print-terms.cjs 2026-10-24 <url>     from somewhere else
 *
 * Chrome does the printing, the one already on the machine, driven over its
 * own debugging protocol. Nothing is installed for it.
 *
 * Afterwards, add the version to src/lib/terms-versions.ts. The file and the
 * list are checked against each other by a test, so a version that is printed
 * and not listed, or listed and not printed, fails the build.
 */
const { spawn } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const [dateArg, urlArg] = process.argv.slice(2);
const DAY = dateArg || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DAY)) {
  console.error("usage: node scripts/print-terms.cjs [YYYY-MM-DD] [url]");
  process.exit(1);
}
const URL_IN = urlArg || "https://maderealblueprint.com/terms.html";
const OUT_DIR = join(__dirname, "..", "public", "terms");
const OUT = join(OUT_DIR, `terms-${DAY}.pdf`);
const PORT = 9335;

const CHROME =
  process.env.CHROME ??
  [
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
if (!CHROME) {
  console.error("No Chrome found. Set CHROME to the binary.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const profile = join(tmpdir(), `terms-print-${Date.now()}`);
  const child = spawn(
    CHROME,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore" },
  );

  // The browser endpoint knows nothing of pages, so a tab is opened and
  // its own socket is used: Page.printToPDF lives there.
  let ws;
  for (let i = 0; i < 50; i++) {
    try {
      const up = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (!up.ok) throw new Error("not up");
      const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
      ws = tab.webSocketDebuggerUrl;
      break;
    } catch {
      await sleep(200);
    }
  }
  if (!ws) {
    child.kill();
    console.error("Chrome did not start.");
    process.exit(1);
  }

  const socket = new WebSocket(ws);
  await new Promise((done) => socket.addEventListener("open", done, { once: true }));
  let id = 0;
  const waiting = new Map();
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const fn = waiting.get(msg.id);
    if (fn) {
      waiting.delete(msg.id);
      fn(msg.result ?? {});
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      waiting.set(n, resolve);
      socket.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Page.enable");
  await send("Page.navigate", { url: URL_IN });
  await sleep(2500);

  const { data } = await send("Page.printToPDF", {
    printBackground: true,
    marginTop: 0.6,
    marginBottom: 0.6,
    marginLeft: 0.6,
    marginRight: 0.6,
  });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, Buffer.from(data, "base64"));

  const bytes = readFileSync(OUT);
  const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`${OUT}: ${pages} page${pages === 1 ? "" : "s"}, ${Math.round(bytes.length / 1024)} KB, from ${URL_IN}`);
  console.log("Now add this version to src/lib/terms-versions.ts.");

  socket.close();
  child.kill();
})();
