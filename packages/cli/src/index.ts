#!/usr/bin/env tsx
/**
 * The `video` command. Run as `pnpm video <command> ...`.
 *
 *   check <project>                        validate specs, references, claims (and build artifacts when present)
 *   plan <project> [--lang]                pacing: seconds, lines, headline rows, wpm per scene
 *   dev <project>                          interactive preview server
 *   still <project> <scene> --at <frame|12.5s|cue:name[+n]|end>[,...] [--lang]
 *   scene <project> <scene> [--lang] [--quality draft|final] [--force]
 *   audio <project> [--lang en|ja|all] [--force]
 *   render <project> [--lang en|ja|all] [--quality draft|final] [--force] [--workers n]
 *
 * Commands are defined in ./commands.ts; see docs/render-commands.md.
 */
import { parseArgs } from "node:util";
import { commands } from "./commands.ts";
import { fail, log } from "./log.ts";

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === "help" || name === "--help") {
    log.plain("usage: pnpm video <command> [args]\n");
    for (const [n, c] of Object.entries(commands)) log.plain(`  ${n.padEnd(12)} ${c.summary}`);
    return;
  }
  const cmd = commands[name];
  if (!cmd) fail(`unknown command '${name}'. Run 'pnpm video help'.`);
  const { values, positionals } = parseArgs({ args: rest, options: cmd.options ?? {}, allowPositionals: true, strict: true });
  await cmd.run(positionals, values as Record<string, string | boolean | undefined>);
  // Long-lived commands (dev) keep the process alive themselves.
  if (!cmd.persistent) process.exit(0);
}

main().catch((e: Error) => fail(e.message, e));
