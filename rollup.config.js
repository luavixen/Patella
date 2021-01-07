import { minify } from "terser";

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
      typeofs: false,
      unsafe_comps: true,
      pure_funcs: [
        "hasProperty", "isObject", "isFunction"
      ]
    }
  },
  renderChunk(code, chunk, options) {
    return minify(code, {
      ...this.config,
      sourceMap: !!options.sourcemap,
      module: /^(esm?|module)$/.test(options.format),
      toplevel: /^c(ommon)?js$/.test(options.format)
    });
  }
};

const input = (input, ...outputs) => ({ input, output: outputs });
const output = (file, format, ...plugins) => ({
  file,
  format,
  plugins,
  name: "Patella",
  indent: "  ",
  sourcemap: true,
  esModule: false,
  strict: false,
  freeze: false
});

export default input("lib/patella.js",
  output("dist/patella.esm.js", "esm"),
  output("dist/patella.cjs.js", "cjs"),
  output("dist/patella.iife.js", "iife"),
  output("dist/patella.esm.min.js", "esm", terser),
  output("dist/patella.cjs.min.js", "cjs", terser),
  output("dist/patella.iife.min.js", "iife", terser)
);