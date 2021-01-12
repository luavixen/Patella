import { HINT_DISPOSED, HINT_DEPENDS } from "./hint.js";
import { computedLock, computedQueue, computedI } from "./computed.js";
import { throwError } from "./error.js";
import { hasProperty, defineHint, isFunction } from "./util.js";

/** See lib/patella.d.ts */
export function dispose(func) {
  if (func == null) {
    func = computedQueue[computedI];
    if (!func) {
      throwError("Attempted to dispose of current computed function while unlocked");
    }
  }

  else if (!isFunction(func)) {
    throwError("Attempted to dispose of a non-function");
  }

  if (hasProperty(func, HINT_DISPOSED)) return;
  defineHint(func, HINT_DISPOSED);

  // Remove from dependant reactive objects
  var depends = func[HINT_DEPENDS];
  if (depends) {
    defineHint(func, HINT_DEPENDS);
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
