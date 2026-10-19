const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const backend = path.resolve(__dirname, "../../aedify/convex");
const originalJs = require.extensions[".js"];
function compile(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
}
require.extensions[".ts"] = compile;
require.extensions[".js"] = (module, filename) =>
  filename.startsWith(backend)
    ? compile(module, filename)
    : originalJs(module, filename);
module.exports = { load: (name) => require(path.join(backend, name + ".ts")) };
