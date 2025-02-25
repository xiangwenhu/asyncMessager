// rollup.config.js
// import typescript from "@rollup/plugin-typescript";
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");

// import nodePolyfills from 'rollup-plugin-node-polyfills';

const NODE_ENV = process.env.NODE_ENV || "test";
console.log("NODE_ENV", NODE_ENV);

module.exports = {
  input: "src/index.ts",

  output: {
    name: "AsyncMessenger",
    file: "dist/umd/index.js",
    format: "umd",
  },

  plugins: [
    typescript({
      tsconfig: "./tsconfig.umd.json",
      declaration: true,
      sourceMap: true,
      useTsconfigDeclarationDir: true,
      importHelpers: false,
      
    }),
    resolve(),
    commonjs({ extensions: [".js", ".ts"] }),
  ],
};
