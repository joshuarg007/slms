import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.tsx",
      name: "SLMSWidget",
      fileName: () => "widget.min.js",
      formats: ["iife"],
    },
    rollupOptions: {
      // Bundle everything into a single file
      output: {
        inlineDynamicImports: true,
        // Ensure React is bundled
        globals: {},
      },
    },
    minify: "esbuild",
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
