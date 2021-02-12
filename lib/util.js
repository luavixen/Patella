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
 * @param value Value to check
 * @returns Is `value` an object?
 */
export function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Checks if a value is a function
 * @param value Value to check
 * @return Is `value` a function?
 */
export function isFunction(value) {
  return typeof value === "function";
}
