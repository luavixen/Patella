export var $Object = Object;

export function hasProperty(object, value) {
  return (
    $Object.prototype.hasOwnProperty.call(object, value)
    && value !== "__proto__"
  );
}

export function defineHint(object, key, value) {
  $Object.defineProperty(object, key, {
    enumerable: false,
    configurable: !!value,
    value: value
  });
}

export function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

export function isFunction(val) {
  return typeof val === "function";
}
