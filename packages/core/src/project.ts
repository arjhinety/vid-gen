import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { Claim, NarrationSpec, ProjectSpec, VoiceSpec, type Lang } from "./schema.ts";

export function findRepoRoot(from = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error(`not inside the vid-gen repository: ${from}`);
    dir = up;
  }
}

export class SpecError extends Error {
  constructor(
    public file: string,
    detail: string,
  ) {
    super(`${file}\n${detail}`);
  }
}

export function loadYaml<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  if (!existsSync(file)) throw new SpecError(file, "file not found");
  let data: unknown;
  try {
    data = parseYaml(readFileSync(file, "utf8"));
  } catch (e) {
    throw new SpecError(file, `YAML parse error: ${(e as Error).message}`);
  }
  const r = schema.safeParse(data);
  if (!r.success) throw new SpecError(file, z.prettifyError(r.error));
  return r.data;
}

export interface LoadedProject {
  root: string;
  dir: string;
  spec: ProjectSpec;
  narration: NarrationSpec;
  claims: Claim[];
  voices: Partial<Record<Lang, VoiceSpec>>;
  /** build/<project>/ output directory (gitignored). */
  buildDir: string;
}

export function projectDir(root: string, id: string) {
  return join(root, "projects", id);
}

export function loadProject(id: string, root = findRepoRoot()): LoadedProject {
  const dir = projectDir(root, id);
  const spec = loadYaml(join(dir, "project.yaml"), ProjectSpec);
  if (spec.id !== id) throw new SpecError(join(dir, "project.yaml"), `id '${spec.id}' does not match folder '${id}'`);
  const narration = loadYaml(join(dir, spec.script), NarrationSpec);
  const claimsFile = join(dir, spec.claims);
  const claims = existsSync(claimsFile) ? loadClaims(claimsFile) : [];
  const voices: LoadedProject["voices"] = {};
  for (const [lang, variant] of Object.entries(spec.languages)) {
    voices[lang as Lang] = loadYaml(join(root, "voices", `${variant!.voice}.yaml`), VoiceSpec);
  }
  return { root, dir, spec, narration, claims, voices, buildDir: join(root, "build", id) };
}

function loadClaims(file: string): Claim[] {
  let data: unknown;
  try {
    data = parseYaml(readFileSync(file, "utf8"));
  } catch (e) {
    throw new SpecError(file, `YAML parse error: ${(e as Error).message}`);
  }
  const list = Array.isArray(data) ? data : ((data as { claims?: unknown[] })?.claims ?? []);
  const r = z.array(Claim).safeParse(list);
  if (!r.success) throw new SpecError(file, z.prettifyError(r.error));
  return r.data;
}
