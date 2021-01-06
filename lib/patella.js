/*
 * == Patella ==
 * Extremely small, fast and compatible reactive programming library.
 *
 * Version 2.0.0
 *
 * MIT License
 *
 * Copyright (c) 2021 Lua MacDougall
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


var HINT_OBSERVED = "__patella";
var HINT_DISPOSED = "__disposed";
var HINT_DEPENDENCIES = "__depends";

var MAX_QUEUE = 2000;


var $Object = Object;

function hasProperty(obj, key) {
  return $Object.prototype.hasOwnProperty.call(obj, key) && key !== "__proto__";
}

function defineProperty(obj, key, val) {
  $Object.defineProperty(obj, key, { enumerable: false, value: val });
}

function defineProperties(obj, props) {
  $Object.defineProperties(obj, props);
}

function createMap() {
  return $Object.create(null);
}


function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

function isFunction(val) {
  return typeof val === "function";
}


function sendWarning(message) {
  console.warn(message);
}

function throwError(message) {
  throw new Error(message);
}


var computedQueue = [];
var computedI = 0;
var computedLock = false;

function computedOverflow() {
  var message = "Computed queue overflow! Last 10 functions in the queue:";

  var length = computedQueue.length;
  for (var i = length - 11; i < length; i++) {
    var func = computedQueue[i];
    message +=
      "\n"
      + (i + 1)
      + ": "
      + ((isFunction(func) && func.name) || "anonymous");
  }

  throwError(message);
}

function computedProcess() {
  if (computedLock) return;
  computedLock = true;

  try {
    for (; computedI < computedQueue.length; computedI++) {
      var func = computedQueue[computedI];
      if (!hasProperty(func, HINT_DISPOSED)) func();
      if (computedI > MAX_QUEUE) computedOverflow();
    }
  } finally {
    computedQueue = [];
    computedI = 0;
    computedLock = false;
  }
}

function computedNotify(func) {
  if (computedQueue.lastIndexOf(func) >= computedI) return;
  computedQueue[computedQueue.length] = func;
  computedProcess();
}


function reactiveGet(
  shadowMap, dependencyMap,
  key
) {
  var func = computedQueue[computedI];
  if (func) {
    var dependencyList = dependencyMap[key];
    if (!dependencyList) dependencyMap[key] = dependencyList = [];

    if (dependencyList.indexOf(func) < 0) {
      dependencyList[dependencyList.length] = func;
    }
  }

  return shadowMap[key];
}

function reactiveSet(
  shadowMap, dependencyMap,
  key, val
) {
  if (isObject(val)) reactiveSetup(val);

  shadowMap[key] = val;

  var dependencyList = dependencyMap[key];
  if (!dependencyList) return;

  for (var i = 0; i < dependencyList.length; i++) {
    var func = dependencyList[i];
    if (func) computedNotify(func);
  }
}

function reactiveCreate(
  descriptorMap, shadowMap, dependencyMap,
  obj, key
) {
  descriptorMap[key] = {
    get: function() {
      return reactiveGet(shadowMap, dependencyMap, key);
    },
    set: function(val) {
      return reactiveSet(shadowMap, dependencyMap, key, val);
    }
  };

  var val = shadowMap[key] = obj[key];
  if (isObject(val)) reactiveSetup(val);
}

function reactiveSetup(obj) {
  if (hasProperty(obj, HINT_OBSERVED)) return;
  defineProperty(obj, HINT_OBSERVED);

  var shadowMap = createMap();
  var dependencyMap = createMap();
  var descriptorMap = createMap();

  for (var key in obj) {
    if (hasProperty(obj, key)) {
      reactiveCreate(descriptorMap, shadowMap, dependencyMap, obj, key);
    }
  }

  defineProperties(obj, descriptorMap);
}


export function observe(obj) {
  if (!isObject(obj) && !isFunction(obj)) {
    throwError("Attempted to observe non-object");
  }

  reactiveSetup(obj);
  return obj;
}

export function computed(func) {
  if (!isFunction(func)) {
    throwError("Attempted to register a non-function as a computed function");
  }

  if (computedLock) {
    sendWarning("Computed function was registered from within another computed function");
  }

  computedNotify(func);
  return func;
}

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

  defineProperty(func, HINT_DISPOSED);
}
