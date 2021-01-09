import { HINT_DISPOSED, HINT_DEPENDS } from "./hint.js";
import { logWarning, throwError } from "./error.js";
import { hasProperty, defineHint } from "./util.js";

var MAX_QUEUE = 2000;

export var computedLock = false;
export var computedQueue = [];
export var computedI = 0;

function computedOverflow() {
  var message = "Computed queue overflow! Last 10 functions in the queue:";

  var length = computedQueue.length;
  for (var i = length - 11; i < length; i++) {
    var func = computedQueue[i];
    message +=
      "\n"
      + (i + 1)
      + ": "
      + (func.name || "anonymous");
  }

  throwError(message);
}

export function computedNotify(func) {
  if (hasProperty(func, HINT_DISPOSED)) return;

  if (computedQueue.lastIndexOf(func) >= computedI) return;
  computedQueue.push(func);

  if (!hasProperty(func, HINT_DEPENDS)) {
    defineHint(func, HINT_DEPENDS, []);
  }

  if (!computedLock) {
    computedLock = true;

    try {
      for (; computedI < computedQueue.length; computedI++) {
        computedQueue[computedI]();
        if (computedI > MAX_QUEUE) /* @__NOINLINE */ computedOverflow();
      }
    } finally {
      computedLock = false;
      computedQueue = [];
      computedI = 0;
    }
  }
}

export function computed(func) {
  if (!isFunction(func)) {
    throwError("Attempted to register a non-function as a computed function");
  }

  if (computedLock) {
    logWarning("Computed function was registered from within another computed function");
  }

  computedNotify(func);
  return func;
}
