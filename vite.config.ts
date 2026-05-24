import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const publicDir = "public";
const outDir = "dist";
const requiredExtensionAssets = [
  "manifest.json",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

function verifyExtensionAssets() {
  return {
    name: "verify-extension-assets",
    closeBundle() {
      const missingAssets = requiredExtensionAssets.filter(
        (asset) => !existsSync(resolve(__dirname, outDir, asset)),
      );

      if (missingAssets.length > 0) {
        throw new Error(
          `Missing required extension assets in ${outDir}: ${missingAssets.join(", ")}`,
        );
      }
    },
  };
}

export default defineConfig({
  publicDir,
  plugins: [verifyExtensionAssets()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
        popup: resolve(__dirname, "popup.html"),
      },
      output: { entryFileNames: "[name].js", format: "es" },
    },
  },
});
