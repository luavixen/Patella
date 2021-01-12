import { HINT_OBSERVED, HINT_DEPENDS } from "./hint.js";
import { computedQueue, computedI, computedNotify } from "./computed.js";
import { throwError } from "./error.js";
import { $Object, hasProperty, defineHint, isObject, isFunction } from "./util.js";

/**
 * Generates a property descriptor for a reactive property
 * @param value Initial property value
 * @returns Property descriptor object
 */
function reactiveProperty(value) {
  if (isObject(value)) reactiveObserve(value);

  // List of computed functions that depend on this property
  var depends = [];
  /**
   * Remove a computed function from this reactive property
   * @param func Computed function to remove
   */
  function dependsRemove(func) {
    var i = depends.lastIndexOf(func);
    if (i >= 0) depends.splice(i, 1);
  }

  return {
    get: function() {
      // Add the current executing computed function to this reactive property's dependencies
      var func = computedQueue[computedI];
      if (func) {
        var i = depends.lastIndexOf(func);
        if (i < 0) {
          // Add them to our dependencies
          depends.push(func);
          // Add us to their dependants
          func[HINT_DEPENDS].push(dependsRemove);
        }
      }

      return value;
    },
    set: function(newValue) {
      value = newValue;
      if (isObject(value)) reactiveObserve(value);

      // Notify all dependencies
      for (var i = 0; i < depends.length; i++) {
        computedNotify(depends[i]);
      }
    }
  };
}

/**
 * Observes an object by making all of its enumerable properties reactive
 * @param object Object to observe
 */
function reactiveObserve(object) {
  if (hasProperty(object, HINT_OBSERVED)) return;
  defineHint(object, HINT_OBSERVED);

  var descriptors = $Object.create(null);

  for (var key in object) {
    if (hasProperty(object, key)) {
      descriptors[key] = /* @__NOINLINE__ */ reactiveProperty(object[key]);
    }
  }

  $Object.defineProperties(object, descriptors);
}

/** See lib/patella.d.ts */
export function observe(object) {
  if (!isObject(object) && !isFunction(object)) {
    throwError("Attempted to observe non-object");
  }

  reactiveObserve(object);
  return object;
}
