const { withNx } = require("@nx/rollup/with-nx");
const terser = require("@rollup/plugin-terser");
const resolve = require("@rollup/plugin-node-resolve");

module.exports = withNx(
  {
    main: "./src/index.ts",
    outputPath: "./dist",
    tsConfig: "./tsconfig.lib.json",
    compiler: "tsc",
    format: ["esm", "cjs"],
    useLegacyTypescriptPlugin: false,
  },
  {
    output: {
      sourcemap: true,
    },
    plugins: [
      resolve({
        preferBuiltins: true,
        extensions: [".ts", ".js", ".mjs"],
        browser: true,
      }),
      terser({
        compress: {
          drop_console: false,
          pure_funcs: [],
        },
        format: {
          comments: false,
        },
      }),
    ],
  }
);
