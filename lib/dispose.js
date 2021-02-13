import { HINT_DISPOSED, HINT_DEPENDS } from "./hint.js";
import { computedLock, computedQueue, computedI } from "./computed.js";
import { hasProperty, defineHint, isFunction, throwError } from "./util.js";

/** See lib/patella.d.ts */
export function dispose(func, clean) {
  if (func == null) {
    func = computedQueue[computedI];
    if (!func) {
      throwError("Attempted to dispose of current computed function while unlocked");
    }
  } else if (!isFunction(func)) {
    throwError("Attempted to dispose of a non-function");
  }

  // Only execute if the function has not been disposed yet
  if (!hasProperty(func, HINT_DISPOSED)) {
    // Only define disposed property if we aren't cleaning
    if (!clean) defineHint(func, HINT_DISPOSED);

    // Remove from dependant reactive objects
    var depends = func[HINT_DEPENDS];
    if (depends) {
      defineHint(func, HINT_DEPENDS, clean ? [] : void 0);
      for (var i = 0; i < depends.length; i++) {
        depends[i](func);
      }
    }

    // Remove from the queue if locked and pending execution
    if (computedLock) { // Not required, but saves a `lastIndexOf` call on an empty array for like 6 bytes
      var i = computedQueue.lastIndexOf(func);
      if (i > computedI) computedQueue.splice(i, 1);
    }
  }

  // Only return the function if it was specified as an argument
  if (!computedLock) return func;
}
