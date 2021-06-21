// Global object/function references
var _Object = Object;
var _Object_hasOwnProperty = _Object.hasOwnProperty;
var _Array_isArray = Array.isArray;
var _Error = Error;
var _TypeError = TypeError;

/** Reference to global Object.defineProperty */
export var defineProperty = _Object.defineProperty;

/**
 * Checks if an object has a specified property as its own property (ignores prototype properties and `__proto__`)
 * @param object Object to check
 * @param key Property key
 * @returns Does `object` have the property `key`?
 */
export function hasOwnProperty(object, key) {
  return key !== "__proto__" && _Object_hasOwnProperty.call(object, key);
}

/**
 * Creates an ECMAScript 6 Symbol, falling back to a simple string in environments that do not support Symbols
 * @param description Symbol description
 * @returns Symbol object or string
 * @function
 */
/* c8 ignore start */
/* istanbul ignore next */
var createSymbol =
  typeof Symbol === "function"
    ? Symbol
    : function (description) {
        return "__" + description;
      };
/* c8 ignore stop */

/** Hint property to indicate if an object has been observed */
export var HINT_OBSERVE = createSymbol("observe");
/** Hint property to indicate if a function has been disposed */
export var HINT_DISPOSE = createSymbol("dispose");
/** Hint property that contains a function's dependency disposal callbacks */
export var HINT_DEPENDS = createSymbol("depends");

/**
 * Defines a hint property on an object
 * @param object Object to define property on
 * @param hint Property key
 * @param {*} [value] Property value, property will be made non-configurable if this is unset (`undefined`)
 */
export function defineHint(object, hint, value) {
  defineProperty(object, hint, {
    value: value,
    configurable: value !== void 0,
    enumerable: false,
    writable: false
  });
}

/**
 * Checks if a value is a normal object, ignores functions and arrays
 * @param value Value to check
 * @returns Is `value` a normal object?
 */
export function isObject(value) {
  return value !== null && typeof value === "object" && !_Array_isArray(value);
}

/**
 * Checks if a value is a function
 * @param value Value to check
 * @return Is `value` a function?
 */
export function isFunction(value) {
  return typeof value === "function";
}

/** Error message printed when an argument is of an incorrect type (not a normal object) */
export var MESSAGE_NOT_OBJECT = "Argument 'object' is not an object";
/** Error message printed when an argument is of an incorrect type (not a function) */
export var MESSAGE_NOT_FUNCTION = "Argument 'func' is not a function";

/**
 * Throws an error message
 * @param message Message to construct the error with
 * @param generic Should the more generic `Error` be thrown instead of `TypeError`?
 */
export function throwError(message, generic) {
  throw new (generic ? _Error : _TypeError)(message);
}
