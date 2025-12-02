import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  define: {
    // Inject version + timestamp for unique builds
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(`${packageJson.version}-${new Date().toISOString()}`)
  },
  json: {
    namedExports: true,
    stringify: false
  },
  server: { port: 5174 },
  base: "/rockswap/",
  build: {
    target: "es2020",
    minify: "esbuild",
    terserOptions: undefined,
    cssMinify: true
  },
  esbuild: {
    drop: ["console", "debugger"]
  }
});
