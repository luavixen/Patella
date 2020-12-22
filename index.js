/*
 * == Luar ==
 * Extremely small, fast and compatible (IE 9 and up) reactive programming
 * library, similar to Hyperactiv.
 *
 * Version 1.4.1-PRERELEASE
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
   * Checks if `val` is a valid JavaScript object
   * @param {any} val Value to check
   * @returns {boolean} Indicates whether `val` is an object
   */
  function isObject(val) {
    return val && typeof val === "object" && !Array.isArray(val);
  }
  /**
   * Checks if `val` is a valid JavaScript function
   * @param {any} val Value to check
   * @returns {boolean} Indicates whether `val` is a function
   */
  function isFunction(val) {
    return typeof val === "function";
  }

  /**
   * Checks if `obj` has the property `key`, ignoring prototypes
   * @param {Object} obj Object to call hasOwnProperty on
   * @param {string} key Key to call hasOwnProperty with
   * @returns {boolean} Indicates whether `obj` has a property named `key`
   */
  function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * Creates a "Map" (object with no prototype)
   * @returns {Object} Empty object with no prototype
   */
  function createMap() {
    return Object.create(null);
  }


  /**
   * Gets the name of a function
   * @param {any} fn Function to get name from
   * @returns {any} Function name, or "anonymous" if the function's name is
   *                invalid. May not be a string!
   */
  function getFunctionName(fn) {
    if (isFunction(fn) && fn.name) {
      return fn.name;
    } else {
      return "anonymous";
    }
  }

  /**
   * Generates an error/warning message
   * @param {string} header Error message header
   * @param {string} body Error message body
   * @param {boolean} [warn] Use "WRN" instead of "ERR"?
   * @returns {string} Formatted error message string
   */
  function createErrorMessage(header, body, warn) {
    return "[Luar] " + (warn ? "WRN " : "ERR ") + header + "\n" + body;
  }


  /**
   * Hint property added to observed objects, used to check if an object has
   * already been observed
   */
  var observeHint = "__luar";
  /**
   * Hint property to add to computed tasks, indicating that they shouldn't be
   * called again and should be removed from dependencies
   */
  var disposeHint = "__disposed";
  /**
   * Defines a hint property on an object
   * @param {Object} obj Object to define the hint property on
   * @param {string} hint Hint key name
   */
  function defineHint(obj, hint) {
    Object.defineProperty(obj, hint, {
      enumerable: false,
      value: true
    });
  }


  /**
   * Maximum number of computed tasks allowed in `computedList`, exceeding this
   * value will cause an overflow error to be thrown
   */
  var computedLimit = 2000;

  /**
   * List of currently executing computed tasks
   */
  var computedList = [];
  /**
   * Index into `computedList`, points to the currently executing computed task
   */
  var computedI = 0;

  /**
   * Mutex-like lock flag for `computedProcess` to prevent multiple executions of
   * the computed task list
   */
  var computedLock = false;

  /**
   * Throws an error indicating an overflow of `computedList`, with descriptions
   * of the last 10 pending/executed computed tasks
   */
  function computedOverflow() {
    // Get the names of the last 10 computed tasks in `computedList`
    var taskNames = [];
    for (var i = computedList.length - 11; i < computedList.length; i++) {
      taskNames[taskNames.length] = i + ": " + getFunctionName(computedList[i]);
    }

    // Throw a descriptive error containing the last 10 task function names
    throw new Error(createErrorMessage(
      "Maximum computed task stack length exceeded (overflow!)",
      "Last 10 tasks in the stack:\n" +
      taskNames.join("\n")
    ));
  }

  /**
   * Executes all pending computed tasks in `computedList`
   */
  function computedProcess() {
    // Attempt to lock the computed processing state (return if already executing)
    if (computedLock) return;
    computedLock = true;

    // Catch errors from rogue computed tasks
    try {
      // Loop through all pending-execution computed tasks
      for (; computedI < computedList.length; computedI++) {
        var task = computedList[computedI];

        // If the task has not been `dispose(task)`'ed, run it!
        if (!hasOwnProperty(task, disposeHint)) {
          task();
        }

        // If we've gone overboard and executed too many tasks, throw an overflow
        // error
        if (computedI > computedLimit) {
          computedOverflow();
        }
      }
    } finally {
      // Reset `computedList`/`computedI`
      computedList = [];
      computedI = 0;
      // Unlock the lock for the next `computedNotify` call
      computedLock = false;
    }
  }

  /**
   * Adds `task` to `computedList` if it hasn't already been added, then start
   * processing through `computedList` if processing isn't already running
   * @param {Function} task Computed task function to queue
   */
  function computedNotify(task) {
    // Make sure that this task isn't already in `computedList`
    for (var i = computedI; i < computedList.length; i++) {
      if (computedList[i] === task) return;
    }

    // Add this task to `computedList`
    computedList[computedList.length] = task;

    // Start processing, if it isn't already running
    computedProcess();
  }


  /**
   * Gets the value stored in a reactive property on a reactive object. This
   * function will also register the current computed task as a dependency, if it
   * is not already registered
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the reactive property to get
   * @returns {any} Value stored in the reactive property (shadowValMap)
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
   * Sets the value stored in a reactive property, automatically notifying any
   * dependant computed tasks
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the reactive property to update
   * @param {any} val Value to set on the reactive property
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
   * Creates a reactive property descriptor (added to `descriptorMap`) for `key`
   * of `originalObject`
   * @param {Object} originalObj Object to retrieve value of `key` from
   * @param {Object} descriptorMap observeObject's descriptorMap, new entry for
   *                               this `key` will be created
   * @param {Object} shadowValMap observeObject's shadowValMap
   * @param {Object} dependencyMap observeObject's dependencyMap
   * @param {string} key Key of the original property to reactify
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

    // Get the current value of the original property
    var val = originalObj[key];
    // If the value is an object, make sure it is reactive
    if (isObject(val)) observeObject(val);

    // Copy the value into the shadow map, for usage in reactiveGet and
    // reactiveSet
    shadowValMap[key] = val;
  }

  /**
   * Makes the properties of an object reactive, if it has not already been made
   * reactive
   * @param {Object} obj Object to reactify
   */
  function observeObject(obj) {
    // Don't re-observe this object if it has already been observed (has observe
    // hint)
    if (hasOwnProperty(obj, observeHint)) return;
    // No hint! Add the hint so the object fails the check if observeObject is
    // called on it a second time
    defineHint(obj, observeHint);

    // shadowValMap is a shadow object that contains all the actual values of all
    // the reactive properties
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
    // New in version 1.4.0, functions can now be observed! But only explicitly,
    // functions will not be observed if they exist as children of a reactive
    // object
    if (!isObject(obj) && !isFunction(obj)) {
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

    if (computedLock) {
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


  /**
   * Object containing all of Luar's public functions, which will be exported as
   * `Luar` or through `module.exports` if `module` is valid
   */
  var localExports = { observe: observe, computed: computed, dispose: dispose };

  // Set localExports on the current module if we are in a CommonJS environment
  /* istanbul ignore else */
  if (typeof module !== "undefined") {
    module.exports = localExports;
  }

  // Return the localExports which will be set as `Luar`, for browser-like
  // environments
  return localExports;

})();
