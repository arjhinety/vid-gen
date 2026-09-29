import type { ComponentType } from "react";

/** Every web scene in every project, lazily loaded. Keys are repo-relative. */
const modules = import.meta.glob<{ default: ComponentType }>("../../../projects/*/scenes/**/*.tsx");

export async function loadScene(project: string, entry: string): Promise<ComponentType> {
  const key = `../../../projects/${project}/${entry.replace(/^\.\//, "")}`;
  const load = modules[key];
  if (!load) {
    const known = Object.keys(modules)
      .filter((k) => k.includes(`/projects/${project}/`))
      .map((k) => k.replace(`../../../projects/${project}/`, ""));
    throw new Error(`web scene not found: ${entry}\nknown: ${known.join(", ") || "(none)"}`);
  }
  const mod = await load();
  if (typeof mod.default !== "function") throw new Error(`${entry} must default-export a React component`);
  return mod.default;
}

export const fileUrl = (repoRelPath: string) => `/__vid/file?path=${encodeURIComponent(repoRelPath)}`;
