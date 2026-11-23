// Bundles each entry as a standalone IIFE (content scripts can't be ES modules)
// and copies static files into dist/. Load dist/ as an unpacked extension.
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

const entryPoints = {
  background: "src/background.ts",
  options: "src/options/options.ts",
  // One injected script per feature. Add new features here.
  "features/video-timestamp": "src/features/video-timestamp/content.ts",
};

function copyStatic() {
  cpSync("public", "dist", { recursive: true });
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

const ctx = await esbuild.context({
  entryPoints,
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
  plugins: [
    {
      name: "copy-static",
      setup(build) {
        build.onEnd(() => copyStatic());
      },
    },
  ],
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
