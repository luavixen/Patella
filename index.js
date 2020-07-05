/*!
 * == Luar ==
 * Extremely small, fast and compatible (IE 9 and up) reactive programming
 * library, similar to Hyperactiv.
 *
 * MIT License
 *
 * Copyright (c) 2020 Lua MacDougall
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var luar = (function () {
  "use strict";

  // Check if an object has a property, ignoring the object's prototypes
  function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // Get the name of a function, or "unknown" if unavailable
  function getFnName(fn) {
    if (typeof fn === "function" && fn.name) {
      return fn.name;
    } else {
      return "unknown";
    }
  }
  // Make a Luar error/warning message string
  function makeErrorMessage(header, body, warn) {
    return (
      "[Luar] " + (warn ? "WRN " : "ERR ") +
      header + "\n" + body
    );
  }

  // [Export] Make a JavaScript object reactive
  function observe(obj) {
  }

  // [Export] Execute a function as a computed task and record its dependencies.
  // The task will then be re-run whenever its dependencies change.
  function computed(fn) {
  }

  // For environments that use CommonJS modules, export the observe() and
  // computed() functions
  if (typeof exports === "object") {
    exports.observe = observe;
    exports.computed = computed;
  }

  // For other environments, return both functions which will be put into the
  // global "luar"
  return { observe: observe, computed: computed };
})();
