import { HINT_DISPOSED, HINT_DEPENDS } from "./hint.js";
import { computedLock, computedQueue, computedI } from "./computed.js";
import { throwError } from "./error.js";
import { hasProperty, defineHint, isFunction } from "./util.js";

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

  var depends = func[HINT_DEPENDS];
  if (depends) {
    defineHint(func, HINT_DEPENDS);
    for (var i = 0; i < depends.length; i++) {
      depends[i](func);
    }
  }

  if (computedLock) {
    var i = computedQueue.lastIndexOf(func);
    if (i > computedI) {
      computedQueue.splice(i, 1);
    }
  }
}
