import esbuild from "esbuild";
import { copyFile, mkdir, cp } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const browserArg = args.find((a) => a.startsWith("--browser="));
const BROWSER = browserArg ? browserArg.split("=")[1] : "chrome";
const WATCH = args.includes("--watch");

if (BROWSER !== "chrome" && BROWSER !== "firefox") {
  console.error(
    `[build] Invalid browser target: ${BROWSER}. Use 'chrome' or 'firefox'.`,
  );
  process.exit(1);
}

const OUT_DIR = resolve(__dirname, "dist");

const sharedOptions = {
  bundle: true,
  sourcemap: "linked",
  target: ["chrome121", "firefox121"],
  logLevel: "info",
  define: {
    "process.env.BROWSER": JSON.stringify(BROWSER),
    "process.env.NODE_ENV": JSON.stringify(
      WATCH ? "development" : "production",
    ),
  },

  external: [],
};

async function copyStaticFiles() {
  // Manifest
  const manifestSrc = resolve(__dirname, `manifests/manifest.${BROWSER}.json`);
  await copyFile(manifestSrc, resolve(OUT_DIR, "manifest.json"));
  console.log(`[build] Copied manifest.${BROWSER}.json → dist/manifest.json`);

  const editorFrameDist = resolve(__dirname, "../editor-frame/dist");
  const editorFrameOut = resolve(OUT_DIR, "editor-frame");
  if (existsSync(editorFrameDist)) {
    await cp(editorFrameDist, editorFrameOut, { recursive: true });
    console.log("[build] Copied editor-frame → dist/editor-frame/");
  } else {
    console.log(
      "[build] WARNING: editor-frame/dist not found. Run `pnpm build:editor-frame` first.",
    );
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Background service worker — ES module
  const backgroundCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: [resolve(__dirname, "src/background/index.ts")],
    outfile: resolve(OUT_DIR, "background.js"),
    format: "es",
  });

  const contentCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: [resolve(__dirname, "src/content/index.ts")],
    outfile: resolve(OUT_DIR, "content.js"),
    format: "iife",
  });

  if (WATCH) {
    await backgroundCtx.watch();
    await contentCtx.watch();
    await copyStaticFiles();
    console.log(`[build] Watching for changes (browser=${BROWSER})...`);
    console.log("[build] Press Ctrl+C to stop.");
    // Keep process alive
    process.on("SIGINT", async () => {
      await backgroundCtx.dispose();
      await contentCtx.dispose();
      process.exit(0);
    });
  } else {
    await backgroundCtx.rebuild();
    await contentCtx.rebuild();
    await backgroundCtx.dispose();
    await contentCtx.dispose();
    await copyStaticFiles();
    console.log(`[build] Build complete (browser=${BROWSER}).`);
  }
}

main().catch((err) => {
  console.error("[build] Fatal error:", err);
  process.exit(1);
});
