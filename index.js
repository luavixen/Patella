/*
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
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var Luar = (function () {

  /**
   * Check if `val` is a valid JavaScript object
   * @param {any} val Value to check
   * @returns {boolean} Indicates whether `val` is an object
   * @private
   */
  function isObject(val) {
    return val && typeof val === "object" && !Array.isArray(val);
  }
  /**
   * Check if `val` is a valid JavaScript function
   * @param {any} val Value to check
   * @returns {boolean} Indicates whether `val` is a function
   * @private
   */
  function isFunction(val) {
    return typeof val === "function";
  }

  /**
   * Check if `obj` has the property `key`, ignoring prototypes
   * @param {Object} obj Object to call hasOwnProperty on
   * @param {string} key Key to call hasOwnProperty with
   * @returns {boolean} Indicated whether `obj` has a property named `key`
   */
  function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * Create a "Map" (object will no prototype)
   * @returns {Object} Empty object with no prototype
   * @private
   */
  function createMap() {
    return Object.create(null);
  }


  /**
   * Attempt to get the name of a function
   * @param {any} fn Function to get name from
   * @returns {any} Function name, or "anonymous" if the function's name is
   *                invalid. Note that this value may not be a string!
   * @private
   */
  function getFunctionName(fn) {
    if (isFunction(fn) && fn.name) {
      return fn.name; // <- Maybe not a string (if set manually)?
    } else {
      return "anonymous";
    }
  }

  /**
   * Generate an error/warning message
   * @param {string} header Error message header
   * @param {string} body Error message body
   * @param {boolean} [warn] Use "WRN" instead of "ERR"?
   * @returns {string} Formatted error message string
   * @private
   */
  function createErrorMessage(header, body, warn) {
    return "[Luar] " + (warn ? "WRN " : "ERR ") + header + "\n" + body;
  }


  /**
   * Hint property to add to observed objects, so they don't get re-observed
   */
  var observeHint = "__luar";
  /**
   * Hint property to add to computed tasks, indicating that they shouldn't be
   * called again and should be removed from dependencies
   */
  var disposeHint = "__disposed";
  /**
   * Define a hint property on an object/function
   * @param {Object} obj Object to define the hint property on
   * @param {string} hint Hint key name
   * @private
   */
  function defineHint(obj, hint) {
    Object.defineProperty(obj, hint, {
      enumerable: false,
      value: true
    });
  }


  var computedLimit = 2000;
  var computedList = [], computedI = 0;
  var computedLock = false;

  function computedOverflow() {
    var taskNames = [];
    for (var i = computedList.length - 11; i < computedList.length; i++) {
      taskNames[taskNames.length] = i + ": " + getFunctionName(computedList[i]);
    }

    throw new Error(createErrorMessage(
      "Maximum computed task stack length exceeded (overflow!)",
      "Last 10 tasks in the stack:\n" +
      taskNames.join("\n")
    ));
  }

  function computedProcess() {
    if (computedLock) return;
    computedLock = true;

    try {
      for (; computedI < computedList.length; computedI++) {
        var task = computedList[computedI];

        if (!hasOwnProperty(task, disposeHint)) {
          task();
        }

        if (computedI > computedLimit) {
          computedOverflow();
        }
      }
    } finally {
      computedList = [];
      computedI = 0;
      computedLock = false;
    }
  }

  function computedNotify(task) {
    for (var i = computedI; i < computedList.length; i++) {
      if (computedList[i] === task) return;
    }

    computedList[computedList.length] = task;

    computedProcess();
  }


  /**
   * Get the value stored in a reactive property on a reactive object. This
   * function will also register the current computed task as a dependency, if
   * it is not already registered
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the reactive property to get
   * @returns {any} Value stored in the reactive property (shadowValMap)
   * @private
   */
  function reactiveGet(
    shadowValMap, dependencyMap,
    key
  ) {
    // registerComputed makes sure that the current computed task is registered
    // as a dependency of this reactive property, since it was accessed while
    // the computed task was running
    registerComputed: {
      // Get the current computed task (exit if we are not in a computed task)
      var task = computedList[computedI];
      if (!task) break registerComputed;

      // Get the dependency list for this key (create it if it does not exist)
      var dependencyList = dependencyMap[key];
      if (!dependencyList) dependencyMap[key] = dependencyList = [];

      // Make sure that this computed task is not already registered as a
      // dependency
      for (var i = 0; i < dependencyList.length; i++) {
        if (dependencyList[i] === task) break registerComputed;
      }

      // Not a dependency! Add this task to the list of dependencies
      dependencyList[dependencyList.length] = task;
    }

    // Return the value stored in this reactive property
    return shadowValMap[key];
  }

  /**
   * Set the value stored in a reactive property, automatically notifying any
   * dependant computed tasks
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the reactive property to update
   * @param {any} val Value to set on the reactive property
   * @private
   */
  function reactiveSet(
    shadowValMap, dependencyMap,
    key, val
  ) {
    // If the value we were given is an object, make sure it is reactive
    if (isObject(val)) observeObject(val);

    // Set the value of this reactive property
    shadowValMap[key] = val;

    // Retrieve the dependency list for this reactive property
    var dependencyList = dependencyMap[key];
    if (!dependencyList) return;

    // Notify/update all the dependent computed tasks
    for (var i = 0; i < dependencyList.length; i++) {
      var task = dependencyList[i];
      if (!task) continue;

      // If this task has been disposed ...
      if (hasOwnProperty(task, disposeHint)) {
        // ... then remove it from the dependency list ...
        dependencyList[i] = null;
      } else {
        // ... or notify it of an update if it is still valid
        computedNotify(task);
      }
    }
  }

  /**
   * Create a reactive property descriptor (added to `descriptorMap`) for `key`
   * of `originalObject`
   * @param {Object} originalObj Object to retrieve value of `key` from
   * @param {Object} descriptorMap observeObject's descriptorMap, new entry for
   *                               this `key` will be created
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the original property to reactify
   * @private
   */
  function reactiveCreate(
    originalObj, descriptorMap, shadowValMap, dependencyMap,
    key
  ) {
    // Create the getter/setter descriptor pair for this reactive property
    descriptorMap[key] = {
      get: function () {
        return reactiveGet(shadowValMap, dependencyMap, key);
      },
      set: function (newVal) {
        reactiveSet(shadowValMap, dependencyMap, key, newVal);
      }
    };

    {
      // Get the current value of the original property
      var val = originalObj[key];
      // If the value is an object, make sure it is reactive
      if (isObject(val)) observeObject(val);

      // Copy the value into the shadow map, for usage in reactiveGet and
      // reactiveSet
      shadowValMap[key] = val;
    }
  }

  /**
   * Make the properties of an object reactive, if it has not already been made
   * reactive
   * @param {Object} obj Object to reactify
   * @private
   */
  function observeObject(obj) {
    // Don't re-observe this object if it has already been observed (has observe
    // hint)
    if (hasOwnProperty(obj, observeHint)) return;
    // No hint! Add the hint so the object fails the check if observeObject is
    // called on it a second time
    defineHint(obj, observeHint);

    // shadowValMap is a shadow object that contains all the actual values of
    // all the reactive properties
    var shadowValMap = createMap();
    // dependencyMap is a map of reactive property keys -> lists of dependent
    // computed tasks
    var dependencyMap = createMap();
    // descriptorMap is passed to Object.defineProperties and contains all the
    // property descriptors for each reactive property
    var descriptorMap = createMap();

    // Loop through all the properties of the object
    for (var key in obj) {
      // Make sure that this property is actually part of the object
      if (!hasOwnProperty(obj, key) || key === "__proto__") continue;
      // Make this property reactive
      reactiveCreate(obj, descriptorMap, shadowValMap, dependencyMap, key);
    }

    // Apply all the generated property descriptors at once
    Object.defineProperties(obj, descriptorMap);
  }


  /** See documentation for this function in: index.d.ts */
  /* export */ function observe(obj) {
    if (!isObject(obj)) {
      throw new Error(createErrorMessage(
        "Attempted to observe a value that is not an object",
        "observe(obj) expects \"obj\" to be an object, got \"" + obj + "\""
      ));
    }

    observeObject(obj);
    return obj;
  }

  /** See documentation for this function in: index.d.ts */
  /* export */ function computed(task) {
    if (!isFunction(task)) {
      throw new Error(createErrorMessage(
        "Attempted to register a value that is not a function as a computed task",
        "computed(task) expects \"task\" to to be a function, got \"" + task + "\""
      ));
    }

    if (computedList[computedI]) {
      console.warn(createErrorMessage(
        "Creating computed tasks from within another computed task is not recommended",
        "Offending computed task: " + getFunctionName(computedList[computedI]) +
        "\nNewly created computed task: " + getFunctionName(task),
        true
      ));
    }

    computedNotify(task);
    return task;
  }

  /** See documentation for this function in: index.d.ts */
  /* export */ function dispose(task) {
    if (task == null) {
      task = computedList[computedI];
      if (!task) {
        throw new Error(createErrorMessage(
          "Attempted to dispose of current computed task while no computed task is running",
          "dispose(task) was called without \"task\" but there is currently no executing computed task to dispose of"
        ));
      }
    }

    else if (!isFunction(task)) {
      throw new Error(createErrorMessage(
        "Attempted to dispose of a value that is not a function",
        "dispose(task) expects \"task\" to be a function, got \"" + task + "\""
      ));
    }

    defineHint(task, disposeHint);
  }


  /* istanbul ignore else */
  if (typeof exports === "object") {
    exports.observe = observe;
    exports.computed = computed;
    exports.dispose = dispose;
  }

  return { observe: observe, computed: computed, dispose: dispose };
})();
