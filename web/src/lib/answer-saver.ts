// Saves answers a short moment after typing stops, in order per field,
// and keeps failed saves to try again. It reports one overall state:
// "saved" only when nothing is waiting, sending or failed.

export type SaveState = "idle" | "saving" | "saved" | "error";

export type PendingAnswer = {
  userId: string;
  exerciseId: string;
  fieldId: string;
  value: unknown;
};

export class AnswerSaver {
  private pending = new Map<string, PendingAnswer>(); // newest value not yet stored
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private chains = new Map<string, Promise<void>>(); // keeps saves per field in order
  private failed = new Set<string>();
  private inFlight = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private save: (item: PendingAnswer) => Promise<void>;
  private onState: (state: SaveState) => void;
  private delayMs: number;
  private retryMs: number;

  constructor(
    save: (item: PendingAnswer) => Promise<void>,
    onState: (state: SaveState) => void,
    delayMs = 800,
    retryMs = 5000,
  ) {
    this.save = save;
    this.onState = onState;
    this.delayMs = delayMs;
    this.retryMs = retryMs;
  }

  schedule(item: PendingAnswer) {
    const key = `${item.exerciseId}/${item.fieldId}`;
    this.pending.set(key, item);
    clearTimeout(this.timers.get(key));
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.send(key);
      }, this.delayMs),
    );
    this.report();
  }

  /** Try all failed saves again now (for example when the internet is back). */
  retryFailed() {
    for (const key of [...this.failed]) if (!this.timers.has(key)) this.send(key);
  }

  /** Sends everything that is waiting now, and resolves when all saves have finished. */
  async flush() {
    for (const [key, timer] of [...this.timers]) {
      clearTimeout(timer);
      this.timers.delete(key);
      this.send(key);
    }
    await Promise.all([...this.chains.values()]);
  }

  get hasUnsaved() {
    return this.pending.size > 0 || this.inFlight > 0;
  }

  private send(key: string) {
    const item = this.pending.get(key);
    if (!item) return;
    this.pending.delete(key);
    this.inFlight++;
    const previous = this.chains.get(key) ?? Promise.resolve();
    const next = previous
      .then(() => this.save(item))
      .then(
        () => {
          this.failed.delete(key);
        },
        () => {
          // Keep the value for a retry, unless a newer value is already waiting.
          if (!this.pending.has(key)) this.pending.set(key, item);
          this.failed.add(key);
          this.retryTimer ??= setTimeout(() => {
            this.retryTimer = null;
            this.retryFailed();
          }, this.retryMs);
        },
      )
      .finally(() => {
        this.inFlight--;
        this.report();
      });
    this.chains.set(key, next);
  }

  private report() {
    if (this.failed.size > 0) this.onState("error");
    else if (this.timers.size > 0 || this.inFlight > 0) this.onState("saving");
    else this.onState("saved");
  }
}
