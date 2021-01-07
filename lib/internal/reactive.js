import { HINT_OBSERVED, HINT_DEPENDS } from "./hint.js";
import { computedQueue, computedI, computedNotify } from "./computed.js";
import { throwError } from "./error.js";
import { $Object, hasProperty, defineHint, isObject, isFunction } from "./util.js";

function reactiveProperty(object, key) {
  var value = object[key];
  if (isObject(value)) reactiveObserve(value);

  var depends = [];
  function dependsRemove(func) {
    var i = depends.lastIndexOf(func);
    if (i >= 0) {
      depends[i] = depends[depends.length - 1];
      depends.pop();
    }
  }

  return {
    get: function() {
      var func = computedQueue[computedI];
      if (func) {
        var i = depends.lastIndexOf(func);
        if (i < 0) {
          depends.push(func);
          func[HINT_DEPENDS].push(dependsRemove);
        }
      }

      return value;
    },
    set: function(newValue) {
      value = newValue;
      if (isObject(value)) reactiveObserve(value);

      for (var i = 0; i < depends.length; i++) {
        computedNotify(depends[i]);
      }
    }
  };
}

function reactiveObserve(object) {
  if (hasProperty(object, HINT_OBSERVED)) return;
  defineHint(object, HINT_OBSERVED);

  var descriptors = $Object.create(null);

  for (var key in object) {
    if (hasProperty(object, key)) {
      descriptors[key] = /* @__NOINLINE__ */ reactiveProperty(object, key);
    }
  }

  $Object.defineProperties(object, descriptors);
}

export function observe(object) {
  if (!isObject(object) && !isFunction(object)) {
    throwError("Attempted to observe non-object");
  }

  reactiveObserve(object);
  return object;
}
