/*
 * Print the result documents to PDF, the way the four in design/results were
 * printed.
 *
 * Chrome does the printing. Nothing is installed for it: the browser is the
 * one already on the machine, driven over its own debugging protocol, and
 * Node's built-in WebSocket is the only client needed. The sheets carry their
 * own A4 size, so the margins are zero and the page CSS decides everything.
 *
 * Before running it, two things have to be up:
 *   cd web && node scripts/preview-mode.cjs     (serves the app on 3001)
 *   node design/screenshots/<who>-answers.mjs <somewhere>/who.json
 *
 * Then:
 *   node design/screenshots/print-results.mjs <somewhere>/who.json <out-dir>
 *
 * It writes one PDF per document, and one for the change plan on its own when
 * the answers carry one (the staying route), which is the last page of Step 3.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [answersPath, outDir] = process.argv.slice(2);
if (!answersPath || !outDir) {
  console.error("usage: node print-results.mjs <answers.json> <out-dir>");
  process.exit(1);
}

const APP = process.env.PREVIEW_URL ?? "http://localhost:3001";
const PORT = 9333;
const CHROME =
  process.env.CHROME ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(
    (p) => {
      try {
        readFileSync(p);
        return true;
      } catch {
        return false;
      }
    },
  );
if (!CHROME) {
  console.error("No Chrome found. Set CHROME to the binary.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One document: the page to print, the file to write, and what to keep. */
const DOCUMENTS = [
  { url: "/step/1/print", file: "01 My Working Direction.pdf" },
  { url: "/step/2/print", file: "02 My Explore Summary.pdf" },
  { url: "/step/3/print", file: "03 My Decision.pdf" },
  { url: "/phase/1/print", file: "04 My Blueprint Phase 1.pdf" },
  // The staying plan on its own, for somebody whose decision was to change
  // where they are. Skipped when the answers carry no change plan.
  { url: "/step/3/print", file: "05 My Change Plan.pdf", only: "if i am staying" },
];

class Chrome {
  static async start() {
    const profile = join(tmpdir(), `blueprint-print-${Date.now()}`);
    const child = spawn(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (res.ok) break;
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
    return new Chrome(child, socket);
  }

  constructor(child, socket) {
    this.child = child;
    this.socket = socket;
    this.id = 0;
    this.waiting = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = this.waiting.get(message.id);
      if (pending) {
        this.waiting.delete(message.id);
        message.error ? pending.bad(new Error(message.error.message)) : pending.ok(message.result);
      }
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, bad) => {
      this.waiting.set(id, { ok, bad });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const { result } = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return result.value;
  }

  async open(url) {
    await this.send("Page.navigate", { url });
    // The documents draw their charts in the browser, so settle rather than
    // race: fonts ready, then a beat for the client render.
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const ready = await this.evaluate(
        "document.readyState === 'complete' && document.fonts.status === 'loaded' && !!document.querySelector('[class*=\"210mm\"]')",
      );
      if (ready) break;
    }
    await sleep(1200);
  }

  stop() {
    try {
      this.socket.close();
    } catch {
      /* already gone */
    }
    this.child.kill();
  }
}

const answers = readFileSync(answersPath, "utf8");
const who = JSON.parse(answers).profile?.first_name ?? "somebody";
mkdirSync(outDir, { recursive: true });

const chrome = await Chrome.start();
try {
  await chrome.send("Page.enable");
  await chrome.send("Runtime.enable");

  // Preview mode reads its answers from this browser's own storage.
  await chrome.open(`${APP}/privacy`);
  const stored = await chrome.evaluate(
    `localStorage.setItem(${JSON.stringify("blueprint-preview-v1")}, ${JSON.stringify(answers)}), ` +
      `Object.keys(JSON.parse(localStorage.getItem("blueprint-preview-v1")).answers).length`,
  );
  console.log(`${who}: ${stored} pages of answers loaded into the preview`);

  for (const doc of DOCUMENTS) {
    await chrome.open(`${APP}${doc.url}`);

    if (doc.only) {
      const kept = await chrome.evaluate(`(() => {
        const sheets = [...document.querySelectorAll('[class*="210mm"]')];
        const wanted = sheets.filter((s) => s.innerText.toLowerCase().includes(${JSON.stringify(doc.only)}));
        if (wanted.length === 0) return 0;
        for (const sheet of sheets) if (!wanted.includes(sheet)) sheet.remove();
        return wanted.length;
      })()`);
      if (kept === 0) {
        console.log(`  ${doc.file}: no "${doc.only}" in these answers, skipped`);
        continue;
      }
    }

    const { data } = await chrome.send("Page.printToPDF", {
      preferCSSPageSize: true,
      printBackground: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    });
    const path = join(outDir, doc.file);
    writeFileSync(path, Buffer.from(data, "base64"));
    const pages = await chrome.evaluate('document.querySelectorAll(\'[class*="210mm"]\').length');
    console.log(`  ${doc.file}: ${pages} page${pages === 1 ? "" : "s"}`);
  }
} finally {
  chrome.stop();
}
