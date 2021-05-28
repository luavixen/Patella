import { minify as minifyTerser } from "terser";
import { minify as minifyUglify } from "uglify-js";

import { mkdir, writeFile } from "fs/promises";

const uglify = {
  name: "uglify",
  config: {
    ie8: true,
    webkit: true,
    v8: true,
    compress: {
      passes: 4,
      hoist_funs: true,
      hoist_vars: true,
      hoist_props: true,
      inline: 2,
      reduce_funcs: false,
      typeofs: false,
      unsafe_comps: true
    },
    output: {
      comments: true
    }
  },
  renderChunk(code, chunk, options) {
    const result = minifyUglify(code, {
      ...uglify.config,
      sourceMap: !!options.sourcemap,
      toplevel: /^c(ommon)?js$/.test(options.format)
    });
    return result.error ? Promise.reject(result.error) : Promise.resolve(result);
  }
};

const terser = {
  name: "terser",
  config: {
    ecma: 5,
    ie8: true,
    safari10: true,
    compress: {
      passes: 4,
      collapse_vars: true,
      hoist_funs: true,
      hoist_vars: true,
      hoist_props: true,
      typeofs: false,
      unsafe_comps: true,
      pure_funcs: [
        "hasOwnProperty", "createSymbol", "isObject", "isFunction"
      ]
    }
  },
  renderChunk(code, chunk, options) {
    return minifyTerser(code, {
      ...terser.config,
      sourceMap: !!options.sourcemap,
      module: /^(esm?|module)$/.test(options.format),
      toplevel: /^c(ommon)?js$/.test(options.format)
    });
  }
};

const packageCJS = {
  name: "package-cjs",
  async buildEnd(error) {
    if (error) return;
    try { await mkdir("./dist"); } catch (error) {}
    await writeFile("./dist/package.json", `{ "type": "commonjs" }\n`);
  }
};

const input = (input, plugins = [], ...output) => ({ input, output, plugins });
const output = (file, format, sourcemap = true, plugins = []) => ({
  file,
  format,
  sourcemap,
  plugins,
  name: "Patella",
  indent: "  ",
  esModule: false,
  strict: false,
  freeze: false
});

export default input("lib/patella.js", [packageCJS],
  output("dist/patella.cjs.js", "cjs"),
  output("dist/patella.iife.min.js", "iife", "hidden", [uglify, terser])
);
