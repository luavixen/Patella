import {
  isObject, isFunction,
  _Object, hasOwnProperty,
  HINT_OBSERVE, defineHint,
  MESSAGE_NOT_OBJECT, throwError
} from "./util.js";

/** See lib/patella.d.ts */
export function ignore(object) {
  if (!isObject(object) && !isFunction(object)) {
    throwError(MESSAGE_NOT_OBJECT);
  }

  if (!hasOwnProperty(object, HINT_OBSERVE)) {
    defineHint(object, HINT_OBSERVE);
  }

  return object;
}
