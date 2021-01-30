/** Reference to the global `Object` */
export var $Object = Object;

/**
 * Checks if an object has a specified property (not including prototype properties)
 * @param object Object to check
 * @param key Property key
 * @returns Does `object` have the property `key`?
 */
export function hasProperty(object, key) {
  return (
    $Object.prototype.hasOwnProperty.call(object, key)
    && key !== "__proto__"
  );
}

/**
 * Defines a hint property on an object
 * @param object Object to define property on
 * @param key Property key
 * @param {*} [value] Property value, omit to define an undefined non-configurable hint
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
 * @param val Value to check
 * @returns Is `val` an object?
 */
export function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

/**
 * Checks if a value is a function
 * @param val Value to check
 * @return Is `val` a function?
 */
export function isFunction(val) {
  return typeof val === "function";
}
