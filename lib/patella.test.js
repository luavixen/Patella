import chai from "chai";
const { assert } = chai;

import { observe, computed, dispose } from "./patella.js";

/**
 * Creates a mock object with various properties
 * @returns {Object} Mock object
 */
const createObject = () => ({
  a: 10, b: 20, c: 30,
  d: { d1: 35, d2: 40 },
  // e: () => true,
  f: [1, 2, 3],
  g: false,
  h: "Hello, world.",
  i: undefined,
  j: null
});

/**
 * Creates a reactive mock object with various properties
 * @returns {Object} Reactive mock object
 */
const createObservedObject = () => observe(createObject());


// Test: API structure and type safety
describe("api", () => {

  it("observe is a function that takes one argument", () => {
    assert.typeOf(observe, "function");
    assert.lengthOf(observe, 1);
  });

  it("observe fails if its argument is not an object", () => {
    const err = "Attempted to observe non-object";
    assert.throws(() => observe(),          err);
    assert.throws(() => observe(undefined), err);
    assert.throws(() => observe(null),      err);
    assert.throws(() => observe(true),      err);
    assert.throws(() => observe("str"),     err);
    assert.throws(() => observe(10),        err);
    assert.throws(() => observe([]),        err);
    // New in version 1.4.0, functions can now be observed! But only explicitly,
    // functions will not be observed if they exist as children of an reactive
    // object
    // assert.throws(() => observe(() => {}),  err);
  });

  it("computed is a function that takes one argument", () => {
    assert.typeOf(computed, "function");
    assert.lengthOf(computed, 1);
  });

  it("computed fails if its argument is not a function", () => {
    const err = "Attempted to register a non-function as a computed function";
    assert.throws(() => computed(),          err);
    assert.throws(() => computed(undefined), err);
    assert.throws(() => computed(null),      err);
    assert.throws(() => computed(true),      err);
    assert.throws(() => computed("str"),     err);
    assert.throws(() => computed(10),        err);
    assert.throws(() => computed([]),        err);
    assert.throws(() => computed({}),        err);
  });

  it("dispose is a function that takes one argument", () => {
    assert.typeOf(dispose, "function");
    assert.lengthOf(dispose, 1);
  });

  it("dispose fails if its argument is not a function and not null/undefined", () => {
    const err = "Attempted to dispose of a non-function";
    assert.throws(() => dispose(true),      err);
    assert.throws(() => dispose("str"),     err);
    assert.throws(() => dispose(10),        err);
    assert.throws(() => dispose([]),        err);
    assert.throws(() => dispose({}),        err);
  });

  it("dispose fails if its argument is null/undefined and not being run in a computed function", () => {
    const err = "Attempted to dispose of current computed function while unlocked";
    assert.throws(() => dispose(),          err);
    assert.throws(() => dispose(null),      err);
    assert.throws(() => dispose(undefined), err);
  });

});

// Test: The observe(obj) function and specific reactive object functionality
// like enumerating reactive objects or creating/modifying reactive properties
describe("observe(obj)", () => {

  it("reactive objects can have their properties accessed like normal objects", () => {
    const obj = createObservedObject();

    // Get property `obj.a`
    const valOfA = obj.a;
    assert.strictEqual(valOfA, 10);

    // Get property that does not exist
    const valOfMissing = obj.missing;
    assert.strictEqual(valOfMissing, undefined);

    // Set property `obj.a`
    obj.a = true;
    assert.strictEqual(obj.a, true);

    // Set child object on property `obj.b`
    obj.b = createObject();
    assert.deepStrictEqual(obj.b, createObject());

    // Set child object on property that does not exist
    obj.notDefined = createObject();
    assert.deepStrictEqual(obj.notDefined, createObject());
  });

  it("reactive objects can be iterated through", () => {
    const obj = createObject();

    // Keys of `obj` before being made reactive
    const beforeObserveKeys = Object.keys(obj);
    // Keys of `obj` after being made reactive
    const afterObserveKeys = [];

    observe(obj);

    // Populate `afterObserveKeys` manually
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      afterObserveKeys.push(key);
    }

    assert.deepStrictEqual(beforeObserveKeys, afterObserveKeys);
  });

  it("reactive objects can have cyclic references", () => {
    // Create an object that contains itself (`obj.self` === `obj`)
    const obj = createObject();
    obj.self = obj;

    // Observe that object
    observe(obj);

    // Make sure it still references itself
    assert.strictEqual(obj, obj.self);
    assert.strictEqual(obj, obj.self.self);
    assert.strictEqual(obj, obj.self.self.self);
    assert.strictEqual(obj, obj.self.self.self.self);
    assert.strictEqual(obj, obj.self.self.self.self.self);
  });

  it("reactive objects work correctly with the spread operator", () => {
    const obj = createObservedObject();

    const spreadObj = { ...obj };

    assert.deepEqual(obj, spreadObj);
    assert.deepEqual(createObject(), spreadObj);
  });

  it("reactive functions can be called", () => {
    let times = 0;

    // `fn` is made reactive, just like an object (functions can have
    // properties)
    const fn = () => times++;
    observe(fn);

    assert.strictEqual(times, 0);

    fn();
    assert.strictEqual(times, 1);

    fn();
    assert.strictEqual(times, 2);
  });

  it("observe(obj) always returns `obj`, even if the object was already observed", () => {
    const obj1 = createObject();
    const obj1Observed = observe(obj1);

    assert.deepStrictEqual(obj1, obj1Observed);

    const obj2 = observe(createObject());
    const obj2Observed = observe(obj2); // Luar versions 1.3.0<= have a broken
                                        // observe(obj) implementation that
                                        // returns `undefined` if `obj` has
                                        // already been observed

    assert.deepStrictEqual(obj2, obj2Observed);
  });

});

// Test: The computed(task) function, computed tasks, and their interactions
// with reactive objects + other computed tasks
describe("computed(task)", () => {

  it("computed task functions are called when they are created", () => {
    let times = 0;
    computed(() => times++);

    assert.strictEqual(times, 1);
  });

  it("computed(task) returns the `task` function passed to it", () => {
    const fn1 = () => {};
    const fn2 = computed(fn1);

    assert.strictEqual(fn1, fn2);
  });

  it("computed(task) will always return `task`, even if `task` has been disposed", () => {
    const fn1 = () => {};
    const fn1Computed = computed(fn1);

    assert.strictEqual(fn1, fn1Computed);

    const fn2 = () => {}; dispose(fn2);
    const fn2Computed = computed(fn2);

    assert.strictEqual(fn2, fn2Computed);
  });

  it("computed tasks are called when their dependencies update", () => {
    const obj = createObservedObject();

    let times = 0;
    computed(() => {
      obj.a;
      times++;
    });

    // Should have already been called (to find its dependencies)
    assert.strictEqual(times, 1);

    // Update property that is a dependency
    obj.a = 22;
    assert.strictEqual(times, 2);

    // Update property that is not a dependency
    obj.b = 11;
    assert.strictEqual(times, 2);

    // Update property that is a dependency again
    obj.a = 34;
    assert.strictEqual(times, 3);
  });

  it("computed tasks can depend on properties of (reactive) functions", () => {
    const fn = () => {};
    fn.a = 10;
    observe(fn);

    let times = 0;
    computed(() => {
      fn.a;
      times++;
    });

    assert.strictEqual(times, 1);

    fn.a = 20;
    assert.strictEqual(times, 2);
  });

  it("computed tasks can depend on multiple objects", () => {
    const obj1 = createObservedObject(),
          obj2 = createObservedObject(),
          obj3 = createObservedObject();

    let times = 0, value = null;
    // Depends on `obj1.a`, `obj2.b`, `obj3.c`
    computed(() => {
      value = obj1.a + obj2.b + obj3.c;
      times++;
    });

    // Should be run once with correct value
    assert.strictEqual(times, 1);
    assert.strictEqual(value, 60);

    // Update `obj1`'s dependency
    obj1.a = 11;
    assert.strictEqual(times, 2);
    assert.strictEqual(value, 61);

    // Update property in `obj2` that isn't a dependency (no effect)
    obj2.a = 34;
    assert.strictEqual(times, 2);
    assert.strictEqual(value, 61);

    // Update `obj2`'s dependency
    obj2.b = 21;
    assert.strictEqual(times, 3);
    assert.strictEqual(value, 62);

    // Update `obj3`'s dependency
    obj3.c = 0;
    assert.strictEqual(times, 4);
    assert.strictEqual(value, 32);
  });

  it("computed tasks will trigger updates in eachother", () => {
    const obj = createObservedObject();

    // Depends on `obj.a`
    let times1 = 0;
    computed(() => {
      obj.a;
      times1++;
    });

    // Depends on `obj.b` (updates `obj.a` if `obj.b` > 40)
    let times2 = 0;
    computed(() => {
      if (obj.b > 40) {
        obj.a = obj.b;
      }
      times2++;
    });

    assert.strictEqual(times1, 1);
    assert.strictEqual(times2, 1);

    // Update dependency but don't trigger the other computed task
    obj.b = 10;
    assert.strictEqual(times1, 1);
    assert.strictEqual(times2, 2);

    // Update dependency and trigger both
    obj.b = 50;
    assert.strictEqual(times1, 2);
    assert.strictEqual(times2, 3);
  });

  it("computed tasks will fail if they infinitely depend on eachother", () => {
    const obj = createObservedObject();

    // Depends on `obj.a`, sets `obj.b`
    let times1 = 0;
    computed(() => {
      obj.a;
      obj.b++;
      times1++;
    });

    // Depends on `obj.b`, sets `obj.a`
    let times2 = 0;
    assert.throws(() => {
      computed(() => {
        obj.b;
        obj.a++;
        times2++;
      });
    }, "Computed queue overflow! Last 10 functions in the queue:");

    // Should have both been run over 100 times (cutoff is 2000)
    assert.operator(times1, ">", 100);
    assert.operator(times2, ">", 100);
  });

  it("computed tasks can be force-notified by re-computing them", () => {
    const obj = createObservedObject();

    // Create a computed task that moves a value
    let times = 0;
    const fn = () => {
      obj.b = obj.a;
      times++;
    }

    // Register it, which will run it once
    computed(fn);
    assert.strictEqual(times, 1);

    // Update its dependencies, which brings the count to 2
    obj.a = 100;
    assert.strictEqual(times, 2);

    // Now re-register it! This will just notify it and is completely safe
    computed(fn);
    assert.strictEqual(times, 3);

    // Update its dependencies again, which will only trigger it once and not
    // twice
    obj.a = 80;
    assert.strictEqual(times, 4);
  });

  it("computed tasks will generate warnings if created/notified from within another computed task", () => {
    const obj = createObservedObject();

    const oldConsoleWarn = console.warn;

    // Mock console.warn to catch the warning message
    let warningMessage;
    console.warn = (...args) => void (warningMessage = args.join(" "));

    const fn = () => {
      // ... bla bla bla update array
      obj.f[2] = 44;
      // ... notify array dependencies
      obj.f = obj.f;
      // ... bla bla bla
      computed(() => {
        // Creating (and even manually notifying) computed tasks from within
        // other computed tasks is bad practice as it can potentially create new
        // tasks every time the the original computed task is called which will
        // stack up and do bad things that the user does not expect
      });
    }

    // Oops! Accidentally running a function that creates computed tasks as a
    // computed task? That's no good!
    computed(fn);

    console.warn = oldConsoleWarn;

    assert.match(warningMessage,
      /Computed function was registered from within another computed function/
    );
  });

  it("computed tasks will propagate errors to where they get triggered", () => {
    const obj = createObservedObject();

    // Generates an error if `obj.a` is set to a value above 30
    computed(() => {
      if (obj.a > 30) {
        throw new Error("Oops!");
      }
    });

    // Cause an error!
    assert.throws(() => obj.a = 31, "Oops!");

    // Note that the value will still change
    assert.strictEqual(obj.a, 31);
  });

});

// Test: The dispose(task) function and functionality of disposed tasks
describe("dispose(task)", () => {

  it("computed tasks are removed from dependencies when disposed", () => {
    const obj = createObservedObject();

    let times = 0;
    const fn = computed(() => {
      obj.a;
      times++;
    });
    assert.strictEqual(times, 1);

    // Reactive before dispose
    obj.a += 10;
    assert.strictEqual(times, 2);

    dispose(fn);

    // Non-reactive after dispose
    obj.a += 10;
    assert.strictEqual(times, 2);
  });

  it("only disposed computed tasks are removed from dependencies when disposed", () => {
    const obj = createObservedObject();

    // Create 3 computed tasks that all depend on `obj.a`
    let fn1, fn2, fn3;
    let times1 = 0, times2 = 0, times3 = 0;
    fn1 = computed(() => { obj.c = obj.a * 2; times1++ });
    fn2 = computed(() => { obj.c = obj.a * 3; times2++ });
    fn3 = computed(() => { obj.c = obj.a * 4; times3++ });

    // All of them should have been run once
    assert.strictEqual(times1, 1);
    assert.strictEqual(times2, 1);
    assert.strictEqual(times3, 1);

    // And they will all run again
    obj.a++;
    assert.strictEqual(times1, 2);
    assert.strictEqual(times2, 2);
    assert.strictEqual(times3, 2);

    // Dispose of the 2nd function
    dispose(fn2);

    // Now the 2nd function gets removed
    obj.a++;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 2);
    assert.strictEqual(times3, 3);

    // Dispose of the 1st function
    dispose(fn1);

    // Now the 1st function also stops working
    obj.a++;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 2);
    assert.strictEqual(times3, 4);

    // Dispose of the last function
    dispose(fn3);

    // No more reactivity!
    obj.a++;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 2);
    assert.strictEqual(times3, 4);
  });

  it("the current computed task is disposed if dispose(task) is called without `task`", () => {
    const obj = createObservedObject();

    // Register computed task that increments times but disposes itself if `obj.a` > 30
    let times = 0;
    computed(() => {
      if (obj.a > 30) {
        dispose();
      }
      times++;
    });
    // Ran immediately
    assert.strictEqual(times, 1);

    // Works fine if `obj.a` <= 30
    obj.a = 20;
    assert.strictEqual(times, 2);

    // Runs, realizes `obj.a` > 30, disposes
    obj.a = 35;
    assert.strictEqual(times, 3);

    // Does not run anymore
    obj.a = 36;
    assert.strictEqual(times, 3);
  });

  it("functions that have been disposed cannot be run as computed tasks", () => {
    // Create a new function that increments times
    let times = 0;
    const fn = () => {
      times++;
    };

    // Dispose the function
    dispose(fn);
    // Attempt to register it
    computed(fn);

    // Computed ignores the function
    assert.strictEqual(times, 0);
  });

  it("if a computed task triggers another computed task, but then disposes of the other computed task, the other computed task will not be run", () => {
    const obj = createObservedObject();

    // Task #1
    let times1 = 0;
    const fn1 = computed(() => {
      obj.b;
      times1++;
    });

    assert.strictEqual(times1, 1);

    // Task #2 (updates #1, disposes of #1 if `obj.a` > 50)
    let times2 = 0;
    const fn2 = computed(() => {
      // Trigger #1
      obj.b = obj.a;
      // Dispose of #1 if `obj.a` > 50
      if (obj.a > 50) {
        dispose(fn1);
      }

      times2++;
    });

    assert.strictEqual(times1, 2);
    assert.strictEqual(times2, 1);

    // Both trigger
    obj.a = 30;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 2);

    // #2 only
    obj.a = 55;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 3);

    // #2 only
    obj.a = 30;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 4);

    // Dispose of #2
    dispose(fn2);

    // None trigger
    obj.a = 10;
    assert.strictEqual(times1, 3);
    assert.strictEqual(times2, 4);
  });

});

// Test: Reactivity edge cases such as special properties (property
// descriptors), prototypes, adding new properties, and re-observing objects
describe("edge cases", () => {

  it("prototype properties are not reactive", () => {
    // Create prototype and object
    const proto = {
      prop2: 10
    };
    const obj = {
      prop1: 20
    };
    Object.setPrototypeOf(obj, proto);

    // Observe the object
    observe(obj);

    // Verify reactivity of own property
    let val1;
    computed(() => {
      val1 = obj.prop1;
    });
    assert.strictEqual(val1, 20);
    obj.prop1 = 30;
    assert.strictEqual(val1, 30);

    // Verify non-reactivity of prototype property
    let val2;
    computed(() => {
      val2 = obj.prop2;
    });
    assert.strictEqual(val2, 10);
    proto.prop2 = 20;
    assert.strictEqual(val2, 10);

    // Also settings it directly won't work
    // Note that "properties added after observation are not reactive"
    obj.prop2 = 20;
    assert.strictEqual(val2, 10);
  });

  it("prototypes can be reactive while the prototype's children are not", () => {
    // Create prototype and object
    const proto = {
      prop2: 10
    };
    const obj = {
      prop1: 20
    };
    Object.setPrototypeOf(obj, proto);

    // Observe the prototype
    observe(proto);

    // Verify non-reactivity of own property
    let val1;
    computed(() => {
      val1 = obj.prop1;
    });
    assert.strictEqual(val1, 20);
    obj.prop1 = 30;
    assert.strictEqual(val1, 20);

    // Verify reactivity of prototype property
    let val2;
    computed(() => {
      val2 = obj.prop2;
    });
    assert.strictEqual(val2, 10);
    proto.prop2 = 20;
    assert.strictEqual(val2, 20);
  });

  it("non-enumerable properties are not reactive", () => {
    const obj = createObject();

    // Define `obj.test` as non-enumerable
    Object.defineProperty(obj, "test", {
      enumerable: false,
      writable: true,
      value: 10
    });

    // Observe the object
    observe(obj);

    // Verify non-reactivity of `obj.test`
    let val;
    computed(() => val = obj.test);
    obj.test = 20;
    assert.strictEqual(val, 10);
  });

  it("non-configurable properties are not reactive", () => {
    const obj = createObject();

    // Define `obj.test` as non-configurable
    Object.defineProperty(obj, "test", {
      configurable: false,
      writable: true,
      value: 10
    });

    observe(obj);

    let val;
    computed(() => val = obj.test);
    obj.test = 20;
    assert.strictEqual(val, 10);
  });

  it("observe will not re-reactify an object that is already reactive", () => {
    const obj = createObservedObject();

    // Make `obj.a` non-reactive by re-defining it with a value of 0
    Object.defineProperty(obj, "a", {
      writable: true,
      value: 0
    });

    // Re-observe the object (does nothing)
    observe(obj);

    // Verify the non-reactivity of `obj.a`
    let val;
    computed(() => val = obj.a);
    obj.a = 10;
    assert.strictEqual(val, 0);
  });

  it("observe makes objects reactive recursively", () => {
    // Create two objects, put one inside the other, and observe the parent
    const subObj = { x: 10 };
    const obj = { a: 10, b: 20, sub: subObj };
    observe(obj);

    let times = 0;
    computed(() => {
      subObj.x;
      times++;
    });
    assert.strictEqual(times, 1);

    // Since we observed its parent, subObj is also reactive
    subObj.x = 20;
    assert.strictEqual(times, 2);
  });

  it("observe will ignore functions when making objects reactive recursively", () => {
    const subFn = Object.assign(() => {}, { x: 10 });
    const obj = { a: 10, b: 20, sub: subFn };
    observe(obj);

    let times = 0;
    computed(() => {
      subFn.x;
      times++;
    });
    assert.strictEqual(times, 1);

    // Recursive reactiveness ignores functions!
    subFn.x = 20;
    assert.strictEqual(times, 1); // <-----
  });

  it("observe will make objects set onto a reactive property into reactive objects themselves", () => {
    // Create a reactive object
    const obj = createObservedObject();

    // Create a non-reactive object and set it onto one of the reactive
    // properties of obj
    const subObj = { x: true };
    obj.a = subObj;

    let times = 0;
    computed(() => {
      subObj.x;
      times++;
    });
    assert.strictEqual(times, 1);

    // Since it was set onto a reactive property, it was also made reactive
    subObj.x = false;
    assert.strictEqual(times, 2);
  });

  it("observe will ignore functions that are set onto a reactive property", () => {
    const obj = createObservedObject();

    const subFn = Object.assign(() => {}, { x: true });
    obj.a = subFn;

    let times = 0;
    computed(() => {
      subFn.x;
      times++;
    });
    assert.strictEqual(times, 1);

    // Implicit reactiveness ignores functions!
    subFn.x = false;
    assert.strictEqual(times, 1); // <-----
  });

  it("arrays are not reactive", () => {
    // Create a reactive object with an array
    const obj = observe({ arr: [1, 2, 3, 4] });

    // Count how many times this fancy array-based computed property gets
    // notified
    let times = 0;
    computed(() => {
      let x = 0;
      for (const elem of obj.arr) {
        x += elem + 10;
      }

      for (let i = 0; i < obj.arr.length; i++) {
        x -= obj.arr[i];
      }

      x;

      times++;
    });
    // Should've just been run once so far
    assert.strictEqual(times, 1);

    // Not reactive!
    obj.arr[0] = 0;
    assert.strictEqual(times, 1);

    // Not reactive!
    obj.arr.push(5);
    assert.strictEqual(times, 1);

    // There we go! This works because this changes the actual value we depend
    // on instead of the contents of the value
    obj.arr = obj.arr;
    assert.strictEqual(times, 2);
  });

  it("properties added after observation are not reactive", () => {
    // Create a new reactive object
    const obj = createObservedObject();

    // Add the new property `obj.added`, which will not be reactive as it was
    // added after creation
    obj.added = 10;

    let times = 0;
    computed(() => {
      obj.added;
      times++;
    });
    assert.strictEqual(times, 1);

    // Not reactive!
    obj.added += 5;
    assert.strictEqual(times, 1);
  });

  it("re-running observe on an object will not make properties added after observation reactive", () => {
    const obj = createObservedObject();
    obj.added = 10;

    let times = 0;
    computed(() => {
      obj.added;
      times++;
    });
    assert.strictEqual(times, 1);

    // Not reactive!
    obj.added += 5;
    assert.strictEqual(times, 1);

    observe(obj);

    // Still not reactive!
    obj.added += 5;
    assert.strictEqual(times, 1);
  });

});

// Test: Issues with prototype name collisions (Luar versions 1.1.0<= have
// issues)
describe("prototype nonsense", () => {

  it("updating reactive properties that share their name with any property of Object.prototype does not throw an error", () => {
    // Create and reactify an object with a property that has the same name as
    // any property present on Object
    const obj = observe({
      hasOwnProperty: 10
    });

    // Then attach a computed property that depends on it
    let times = 0;
    computed(() => {
      obj.hasOwnProperty;
      times++;
    });
    assert.strictEqual(times, 1);

    // Then try and update it
    obj.hasOwnProperty++; // Due to the
                          // dependencyMap.__proto__ === Object.prototype, this
                          // line will crash Luar versions 1.1.0<= with a
                          // cryptic error message
    assert.strictEqual(times, 2);
  });

  it("properties named __proto__ are ignored by observe", () => {
    // Create a new object with a `__proto__` property
    const obj = Object.create(null);
    Object.defineProperty(obj, "__proto__", {
      writable: true,
      value: 10
    });

    // Check that `obj.__proto__` was correctly set
    const overriddenPrototype = obj.__proto__;
    const actualPrototype = Object.getPrototypeOf(obj);
    assert.strictEqual(overriddenPrototype, 10);
    assert.strictEqual(actualPrototype, null);

    // Get the current `obj.__proto__` descriptor
    const getDescriptor = () => Object.assign({}, Object.getOwnPropertyDescriptor(obj, "__proto__"));
    const originalDescriptor = getDescriptor();

    // Reactify the object
    observe(obj);

    // Check that the `obj.__proto__` descriptor was left unchanged
    const observedDescriptor = getDescriptor();
    assert.deepEqual(originalDescriptor, observedDescriptor);

    // Attempt to attach a computed property to `obj.__proto__`
    let times = 0;
    computed(() => {
      obj.__proto__;
      times++;
    });
    assert.strictEqual(times, 1);

    // Not reactive!
    obj.__proto__++;
    assert.strictEqual(times, 1);
  });

});
