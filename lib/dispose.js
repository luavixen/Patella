import { computedLock, computedQueue, computedI } from "./computed.js";
import {
  isFunction,
  _Object, hasOwnProperty,
  HINT_DISPOSE, HINT_DEPENDS, defineHint,
  MESSAGE_NOT_FUNCTION, throwError
} from "./util.js";

/** See lib/patella.d.ts */
export function dispose(func, clean) {
  if (func == null) {
    func = computedQueue[computedI];
    if (!func) {
      throwError("Tried to dispose of current computed function while not running a computed function", true);
    }
  } else if (!isFunction(func)) {
    throwError(MESSAGE_NOT_FUNCTION);
  }

  // Only execute if the function has not been disposed yet
  if (!hasOwnProperty(func, HINT_DISPOSE)) {
    // Only define disposed property if we aren't cleaning
    if (!clean) defineHint(func, HINT_DISPOSE);

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
