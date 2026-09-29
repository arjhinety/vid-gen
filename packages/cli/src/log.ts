const c = (n: number) => (s: string) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s);
const dim = c(2);
const red = c(31);
const green = c(32);
const yellow = c(33);

export const log = {
  plain: (s: string) => console.log(s),
  step: (s: string) => console.log(`${dim("›")} ${s}`),
  ok: (s: string) => console.log(`${green("✓")} ${s}`),
  warn: (s: string) => console.log(`${yellow("!")} ${s}`),
  err: (s: string) => console.error(`${red("✗")} ${s}`),
  dim,
};

export function fail(message: string, e?: Error): never {
  log.err(message);
  if (process.env.VIDEO_DEBUG && e?.stack) console.error(dim(e.stack));
  else if (e && !(e.name === "SpecError")) console.error(dim("(set VIDEO_DEBUG=1 for a stack trace)"));
  process.exit(1);
}

export function progressBar(label: string) {
  let last = 0;
  let finished = false;
  return (done: number, total: number) => {
    if (finished) return;
    finished = done >= total;
    const now = Date.now();
    if (done < total && now - last < 250) return;
    last = now;
    const pct = done >= total ? 100 : Math.min(99, Math.floor((done / total) * 100));
    const bar = "█".repeat(Math.round(pct / 4)).padEnd(25, "·");
    if (process.stdout.isTTY) process.stdout.write(`\r${label} ${bar} ${pct}% (${done}/${total})${done === total ? "\n" : ""}`);
    else if (done === total || pct % 25 === 0) console.log(`${label} ${pct}% (${done}/${total})`);
  };
}
