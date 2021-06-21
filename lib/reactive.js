import { computedQueue, computedI, computedNotify } from "./computed.js";
import {
  isObject, isFunction,
  hasOwnProperty, defineProperty,
  HINT_OBSERVE, HINT_DEPENDS, defineHint,
  MESSAGE_NOT_OBJECT, throwError
} from "./util.js";

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
      if (isObject(newValue)) reactiveObserve(newValue);
      value = newValue;

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
  if (hasOwnProperty(object, HINT_OBSERVE)) return;
  defineHint(object, HINT_OBSERVE);

  for (var key in object) {
    if (hasOwnProperty(object, key)) {
      try {
        defineProperty(object, key, reactiveProperty(object[key]));
      } catch (err) {}
    }
  }
}

/** See lib/patella.d.ts */
export function observe(object) {
  if (!isObject(object) && !isFunction(object)) {
    throwError(MESSAGE_NOT_OBJECT);
  }

  reactiveObserve(object);
  return object;
}
