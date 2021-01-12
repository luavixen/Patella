import { HINT_OBSERVED } from "./hint.js";
import { throwError } from "./error.js";
import { hasProperty, defineHint, isObject, isFunction } from "./util.js";

/** See lib/patella.d.ts */
export function ignore(object) {
  if (!isObject(object) && !isFunction(object)) {
    throwError("Attempted to ignore non-object");
  }

  if (!hasProperty(object, HINT_OBSERVED)) {
    defineHint(object, HINT_OBSERVED);
  }

  return object;
}