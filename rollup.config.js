import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import { dts } from "rollup-plugin-dts";
export default defineConfig([
  {
    input: "src/index.ts",
    external: ["monaco-editor/esm/vs/editor/editor.api", "loro-crdt"],
    output: {
      file: "dist/loro-monaco.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [typescript()],
  },
  {
    input: "src/index.ts",
    plugins: [dts()],
    output: {
        format: 'esm',
        file: 'dist/loro-monaco.d.ts'
    }
  }
]);
