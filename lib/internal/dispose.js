import { HINT_DEPENDS, HINT_DISPOSED } from "./hint.js";
import { computedLock, computedQueue, computedI } from "./computed.js";
import { throwError } from "./error.js";
import { defineHint } from "./util.js";

export function dispose(func) {
  if (func == null) {
    func = computedQueue[computedI];
    if (!func) {
      throwError("Attempted to dispose of current computed function outside of a computed function");
    }
  }

  else if (!isFunction(func)) {
    throwError("Attempted to dispose of a non-function");
  }

  var depends = func[HINT_DEPENDS];

  defineHint(func, HINT_DISPOSED);
  defineHint(func, HINT_DEPENDS);

  if (depends) {
    for (var i = 0; i < depends.length; i++) {
      depends[i](func);
    }
  }

  if (computedLock) {
    var i = computedQueue.lastIndexOf(func);
    if (i > computedI) {
      computedQueue[i] = computedQueue[computedQueue.length - 1];
      computedQueue.pop();
    }
  }
}
