/** Reference to the global `Object` */
export var $Object = Object;

/**
 * Checks if an object has a specified property (not including prototype properties)
 * @param {Object} object Object to check
 * @param {(string|number|symbol)} key Property key
 * @return {boolean} Does `object` have the property `key`?
 */
export function hasProperty(object, key) {
  return (
    $Object.prototype.hasOwnProperty.call(object, key)
    && key !== "__proto__"
  );
}

/**
 * Defines a hint property on an object
 * @param {Object} object Object to define property on
 * @param {(string|number|symbol)} key Property key
 * @param {*} value Property value
 */
export function defineHint(object, key, value) {
  $Object.defineProperty(object, key, {
    enumerable: false,
    configurable: !!value,
    value: value
  });
}

/**
 * Checks if a value is an object
 * @param {*} val Value to check
 * @return {boolean} Is `val` an object?
 */
export function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

/**
 * Checks if a value is a function
 * @param {*} val Value to check
 * @return {boolean} Is `val` a function?
 */
export function isFunction(val) {
  return typeof val === "function";
}
