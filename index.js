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
  // Check if a value is an object
  function isObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }
  // Check if a value is a function
  function isFunction(v) {
    return typeof v === "function";
  }

  // Check if an object has a property, ignoring the object's prototypes
  function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // Get the name of a function, or "anonymous" if unavailable
  function getFnName(fn) {
    if (isFunction(fn) && fn.name) {
      return fn.name;
    } else {
      return "anonymous";
    }
  }
  // Make a Luar error/warning message string
  function makeErrorMessage(header, body, warn) {
    return (
      "[Luar] " + (warn ? "WRN " : "ERR ") +
      header + "\n" + body
    );
  }

  // Maximum number of tasks to execute in a single task cycle
  var computedTaskLimit = 2000;
  // Task function list (and current index into said list)
  var computedTasks = [], computedI = 0;
  // Mutex-y lock for processing the current computed task list, so that we
  // don't try to run the same tasks twice
  var computedLock = false;

  // Throw a "stack overflow" error if the length of computedTasks becomes
  // bigger than computedTaskLimit
  function computedOverflow() {
    var taskFnNames = [];

    // Gather function names of the last 10 tasks
    // Most likely contains something like [badFn1, badFn2, badFn1, badFn2, ...]
    for (var i = computedTasks.length - 10 - 1; i < computedTasks.length; i++) {
      taskFnNames[taskFnNames.length] = i + ": " + getFnName(computedTasks[i]);
    }

    throw new Error(makeErrorMessage(
      "Maximum computed task length exceeded (stack overflow!)",
      "Last 10 functions in the task:\n" +
      taskFnNames.join("\n")
    ));
  }
  // Process the current computed task list (and all of its dependencies)
  function computedProcess() {
    // Attempt to lock the mutex-thing
    if (computedLock) return;
    computedLock = true;

    // Wrap this in a try-finally block so that we always remember to
    // unlock and clean up the state once we're done, even if we fail
    try {
      // Go through and execute all the computed tasks
      for (; computedI < computedTasks.length; computedI++) {
        // Call this task
        computedTasks[computedI]();
        // Check for overflow
        if (computedI > computedTaskLimit) {
          computedOverflow();
        }
      }
    } finally {
      // Done! Reset the list of tasks
      computedTasks = [];
      computedI = 0;
      // And unlock the mutex-thing
      computedLock = false;
    }
  }
  // Notify a computed task that one of its dependencies has updated
  function computedNotify(fn) {
    // Ensure that this task is not already queued to be executed
    for (var i = computedI; i < computedTasks.length; i++) {
      if (computedTasks[i] === fn) return;
    }

    // Push this task onto the computedTasks list
    computedTasks[computedTasks.length] = fn;

    // Make sure the task list is being processed (so that the new task actually
    // runs)
    computedProcess();
  }

  // Hint property to add to observed objects, so that they don't get observed
  // again
  var observeHint = "__luar";
  // Internal observe, the obj parameter must be a valid object
  function observeObject(obj) {
    // Don't observe it if it has the hint
    if (hasOwnProperty(obj, observeHint)) return;
    // Define the hint on this object and make it non-enumerable (done before
    // creating the object to allow for cyclic references)
    Object.defineProperty(obj, observeHint, {
      enumerable: false,
      configurable: false,
      value: true
    });

    // The shadow object contains the actual values modified/returned by the
    // getters and setters
    var shadow = {};

    // List of dependant computed tasks (stored as { [key]: task[] })
    var dependencyMap = Object.create(null);
    // Get a value from a key and update dependencies if we are currently in a
    // computed task
    function reactiveGet(key) {
      // Get the value to return
      var val = shadow[key];

      // Get the current task
      var fn = computedTasks[computedI];
      // Return if there is no task
      if (!fn) return val;

      // Get the dependency array for this key (or create it)
      var deps = dependencyMap[key];
      if (!deps) deps = dependencyMap[key] = [];

      // Ensure that the task is not already a dependency
      for (var i = 0; i < deps.length; i++) {
        if (deps[i] === fn) return val;
      }
      // Add the task to the dependency array
      deps[deps.length] = fn;

      return val;
    }
    // Update a key and notify all of the key's dependencies
    function reactiveSet(key, val) {
      // Make the value reactive if it is an object
      if (isObject(val)) {
        observeObject(val);
      }

      // Update the key
      shadow[key] = val;

      // Get the dependency array for this key
      var deps = dependencyMap[key];
      // Return if there are no dependencies
      if (!deps) return;

      // Notify all the dependencies
      for (var i = 0; i < deps.length; i++) {
        computedNotify(deps[i]);
      }
    }

    // Getter/setter definitions to pass to Object.defineProperties
    var props = {};

    // Create a reactive key on an object
    function reactiveCreate(key) {
      // Get the original value from the original object
      var val = obj[key];
      // If the value is also an object, make it reactive too (deep reactivity)
      if (isObject(val)) {
        observe(val);
      }

      // Set this value in the shadow object ...
      shadow[key] = val;
      // ... and define the getters/setters
      props[key] = {
        get: function () {
          return reactiveGet(key);
        },
        set: function (val) {
          reactiveSet(key, val);
        }
      };
    }

    // Loop over the keys of the object and make any keys that are actually part
    // of the object reactive
    for (var key in obj) {
      if (!hasOwnProperty(obj, key) || key === "__proto__") continue;
      reactiveCreate(key);
    }

    // Apply all the getters/setters we just created
    Object.defineProperties(obj, props);

    return obj;
  }

  // [Export] Make a JavaScript object reactive
  function observe(obj) {
    // Since this is an export, typecheck its arguments
    if (!isObject(obj)) {
      throw new Error(makeErrorMessage(
        "Attempted to observe a value that is not an object",
        "observe(obj) expects \"obj\" to be an object, got \"" + obj + "\""
      ));
    }

    // Call internal observe
    return observeObject(obj);
  }
  // [Export] Execute a function as a computed task and record its dependencies.
  // The task will then be re-run whenever its dependencies change.
  function computed(fn) {
    // Since this is an export, typecheck its arguments
    if (!isFunction(fn)) {
      throw new Error(makeErrorMessage(
        "Attempted to register a value that is not a function as a computed task",
        "computed(fn) expects \"fn\" to to be a function, got \"" + fn + "\""
      ));
    }

    // Also emit a warning if the user is creating a computed task from within
    // another computed task, as this can lead to duplicate tasks being
    // registered when the offender is re-run when its dependencies change
    if (computedTasks.length) {
      console.warn(makeErrorMessage(
        "Creating computed functions from within another computed function is not recommended",
        "Offending computed function: " + getFnName(computedTasks[computedI]) +
        "\nNewly created computed function: " + getFnName(fn),
        true
      ));
    }

    // "Notify" this new computed task to register it in all of its dependencies
    computedNotify(fn);
  }

  // For environments that use CommonJS modules, export the observe() and
  // computed() functions
  /* istanbul ignore else */
  if (isObject(exports)) {
    exports.observe = observe;
    exports.computed = computed;
  }

  // For other environments, return both functions which will be put into the
  // global "Luar"
  return { observe: observe, computed: computed };
})();
