/** Programmatic Vite server shared by `video dev` (interactive) and the web renderer (headless). */
import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type ViteDevServer } from "vite";
import { vidPlugin } from "./vite-plugin.ts";

const here = dirname(fileURLToPath(import.meta.url));

export async function startPlayerServer(root: string, opts: { port?: number; quiet?: boolean } = {}): Promise<{ server: ViteDevServer; url: string }> {
  const server = await createServer({
    configFile: false,
    root: here,
    logLevel: opts.quiet ? "error" : "info",
    plugins: [react(), vidPlugin(root)],
    server: {
      port: opts.port ?? 5173,
      strictPort: false,
      fs: { allow: [root] },
      hmr: !opts.quiet,
    },
    // Pre-bundle everything up front: on-the-fly discovery re-optimises mid-load
    // and breaks module identity (e.g. react-dom export mismatches) in headless renders.
    cacheDir: join(root, ".cache", "vite"),
    optimizeDeps: {
      entries: [join(here, "src", "main.tsx")],
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      holdUntilCrawlEnd: true,
    },
    clearScreen: false,
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`;
  return { server, url };
}
