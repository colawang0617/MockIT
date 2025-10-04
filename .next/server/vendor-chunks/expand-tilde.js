/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/expand-tilde";
exports.ids = ["vendor-chunks/expand-tilde"];
exports.modules = {

/***/ "(rsc)/./node_modules/expand-tilde/index.js":
/*!********************************************!*\
  !*** ./node_modules/expand-tilde/index.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("/*!\n * expand-tilde <https://github.com/jonschlinkert/expand-tilde>\n *\n * Copyright (c) 2015 Jon Schlinkert.\n * Licensed under the MIT license.\n */\n\nvar homedir = __webpack_require__(/*! homedir-polyfill */ \"(rsc)/./node_modules/homedir-polyfill/index.js\");\nvar path = __webpack_require__(/*! path */ \"path\");\n\nmodule.exports = function expandTilde(filepath) {\n  var home = homedir();\n\n  if (filepath.charCodeAt(0) === 126 /* ~ */) {\n    if (filepath.charCodeAt(1) === 43 /* + */) {\n      return path.join(process.cwd(), filepath.slice(2));\n    }\n    return home ? path.join(home, filepath.slice(1)) : filepath;\n  }\n\n  return filepath;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvZXhwYW5kLXRpbGRlL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxjQUFjLG1CQUFPLENBQUMsd0VBQWtCO0FBQ3hDLFdBQVcsbUJBQU8sQ0FBQyxrQkFBTTs7QUFFekI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL3dhbmdoYW90YWkvRGVza3RvcC9lbHZlbmxhYi9IVFYvbm9kZV9tb2R1bGVzL2V4cGFuZC10aWxkZS9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIGV4cGFuZC10aWxkZSA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvZXhwYW5kLXRpbGRlPlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBKb24gU2NobGlua2VydC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG52YXIgaG9tZWRpciA9IHJlcXVpcmUoJ2hvbWVkaXItcG9seWZpbGwnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4cGFuZFRpbGRlKGZpbGVwYXRoKSB7XG4gIHZhciBob21lID0gaG9tZWRpcigpO1xuXG4gIGlmIChmaWxlcGF0aC5jaGFyQ29kZUF0KDApID09PSAxMjYgLyogfiAqLykge1xuICAgIGlmIChmaWxlcGF0aC5jaGFyQ29kZUF0KDEpID09PSA0MyAvKiArICovKSB7XG4gICAgICByZXR1cm4gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIGZpbGVwYXRoLnNsaWNlKDIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGhvbWUgPyBwYXRoLmpvaW4oaG9tZSwgZmlsZXBhdGguc2xpY2UoMSkpIDogZmlsZXBhdGg7XG4gIH1cblxuICByZXR1cm4gZmlsZXBhdGg7XG59O1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/expand-tilde/index.js\n");

/***/ })

};
;