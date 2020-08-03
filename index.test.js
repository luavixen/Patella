// Chai provides various assertion functions
const { assert } = require("chai");

// Get the Luar functions
const { observe, computed, dispose } = require(".");

// Function for making a basic object containing primitives
const makeObj = () =>
  ({
    a: 10, b: 20,
    example: { hello: "Hello", world: "world", happy: true },
    ["null?"]: null
  });

// Function for making an observed object
const makeObserved = () =>
  observe({
    a: 10, b: 20, c: 30,
    d: { d1: 35, d2: 40 },
    e: () => true,
    f: [1, 2, 3],
    g: false,
    h: "Hello, world.",
    i: undefined,
    j: null
  });

// Test API function definitions and basic typechecking error conditions
describe("api safety", () => {

  it("observe is a function that takes one argument", () => {
    assert.typeOf(observe, "function");
    assert.lengthOf(observe, 1);
  });

  it("observe fails if its argument is not an object", () => {
    const err = "Attempted to observe a value that is not an object";
    assert.throws(() => observe(),          err);
    assert.throws(() => observe(null),      err);
    assert.throws(() => observe(() => {}),  err);
    assert.throws(() => observe([]),        err);
  });

  it("computed is a function that takes one argument", () => {
    assert.typeOf(computed, "function");
    assert.lengthOf(computed, 1);
  });

  it("computed fails if its argument is not a function", () => {
    const err =
      "Attempted to register a value that is not a function as a computed task";
    assert.throws(() => computed(),     err);
    assert.throws(() => computed(null), err);
    assert.throws(() => computed({}),   err);
  });

  it("dispose is a function that takes one argument", () => {
    assert.typeOf(dispose, "function");
    assert.lengthOf(dispose, 1);
  });

  it("dispose fails if its argument is not a function and not null/undefined", () => {
    const err =
      "Attempted to dispose of a value that is not a function";
    assert.throws(() => dispose(10),    err);
    assert.throws(() => dispose("fn"),  err);
    assert.throws(() => dispose({}),    err);
  });

  it("dispose fails if its argument is null/undefined and not being run in a computed function", () => {
    const err =
      "Attempted to dispose of current computed task while no computed task is running";
    assert.throws(() => dispose(),          err);
    assert.throws(() => dispose(null),      err);
    assert.throws(() => dispose(undefined), err);
  });

});

// Test specific observe functionality like the like enumerating observed
// objects or creating/modifying observed properties
describe("observed object correctness", () => {

  it("observed objects can have properties set/get", () => {
    const obj = makeObserved();

    // Get
    const valOfA = obj.a;
    assert.strictEqual(valOfA, 10);

    // Get a property that does not exist
    const valOfMissing = obj.missing;
    assert.strictEqual(valOfMissing, undefined);

    // Set
    obj.a = true;
    assert.strictEqual(obj.a, true);

    // Set object
    obj.b = makeObj();
    assert.deepStrictEqual(obj.b, makeObj());

    // Set object on a property that does not exist
    obj.notDefined = makeObj();
    assert.deepStrictEqual(obj.notDefined, makeObj());
  });

  it("observed objects can be iterated through", () => {
    const obj = makeObj();
    const objKeys = Object.keys(obj);
    observe(obj);

    // Make sure that we can iterate through all the keys
    const keys = [];
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      keys.push(key);
    }

    assert.deepStrictEqual(keys, objKeys);
  });

  it("observed objects can have cyclic references", () => {
    // Make an object that contains itself
    const obj = makeObj();
    obj.self = obj;

    // Observe that object
    observe(obj);

    // Make sure it still references itself
    assert.strictEqual(obj, obj.self);
    assert.strictEqual(obj, obj.self.self.self.self.self.self.self);
  });

  it("observed objects can be spread", () => {
    const obj = makeObj();
    observe(obj);

    const spreadObj = { ...obj };

    assert.deepEqual(obj, spreadObj);
    assert.deepEqual(makeObj(), spreadObj);
  });

});

// Test computed tasks and their interactions with objects and eachother
describe("computed task functionality", () => {

  it("computed task functions are called when they are created", () => {
    let times = 0;
    computed(() => times++);

    assert.strictEqual(times, 1);
  });

  it("computed returns the task function passed to it", () => {
    const fn1 = () => {};
    const fn2 = computed(fn1);

    assert.strictEqual(fn1, fn2);
  });

  it("computed tasks are called when their dependencies update", () => {
    const obj = makeObserved();

    let times = 0;
    computed(() => {
      obj.a;
      times++;
    });

    // Should have already been called (to find its dependencies)
    assert.strictEqual(times, 1);

    // Update a dependency
    obj.a = 22;
    assert.strictEqual(times, 2);

    // Update a property that is not a dependency
    obj.b = 11;
    assert.strictEqual(times, 2);

    // Update a dependency again
    obj.a = 34;
    assert.strictEqual(times, 3);
  });

  it("computed tasks can depend on multiple objects", () => {
    const obj1 = makeObserved(), obj2 = makeObserved(), obj3 = makeObserved();

    let times = 0, value = null;
    // Depends on obj1.a, obj2.b, obj3.c
    computed(() => {
      value = obj1.a + obj2.b + obj3.c;
      times++;
    });

    // Should be run once with correct value
    assert.strictEqual(times, 1);
    assert.strictEqual(value, 60);

    // Update obj1's dependency
    obj1.a = 11;
    assert.strictEqual(times, 2);
    assert.strictEqual(value, 61);

    // Update a property in obj2 that isn't a dependency (no effect)
    obj2.a = 34;
    assert.strictEqual(times, 2);
    assert.strictEqual(value, 61);

    // Update obj2's dependency
    obj2.b = 21;
    assert.strictEqual(times, 3);
    assert.strictEqual(value, 62);

    // Update obj3's dependency
    obj3.c = 0;
    assert.strictEqual(times, 4);
    assert.strictEqual(value, 32);
  });

  it("computed tasks will trigger updates in eachother", () => {
    const obj = makeObserved();

    // Depends on a
    let times1 = 0;
    computed(() => {
      obj.a;
      times1++;
    });

    // Depends on b (updates a if b > 40)
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
    const obj = makeObserved();

    // Depends on a, sets b
    let times1 = 0;
    computed(() => {
      obj.a;
      obj.b++;
      times1++;
    });

    // Depends on b, sets a
    let times2 = 0;
    assert.throws(() => {
      computed(() => {
        obj.b;
        obj.a++;
        times2++;
      });
    }, "Maximum computed task length exceeded (stack overflow!)");

    // Should have both been run over 100 times (cutoff is 2000)
    assert.operator(times1, ">", 100);
    assert.operator(times2, ">", 100);
  });

  it("computed tasks can be force-notified by re-computing them", () => {
    const obj = makeObserved();

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
    const obj = makeObserved();

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
      /Creating computed functions from within another computed function is not recommended/
    );
  });

  it("computed tasks will propagate errors to where they get triggered", () => {
    const obj = makeObserved();

    // Generates an error if obj.a is set to a value above 30
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

// Test disposal of computed tasks, ensuring they get removed and are not run
// again
describe("dispose functionality", () => {

  it("computed tasks are removed from dependencies when disposed", () => {
    const obj = makeObserved();

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
    const obj = makeObserved();

    // Create 3 computed tasks that all depend on obj.a
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

  it("the current computed task is disposed if dispose(fn) is called without \"fn\"", () => {
    const obj = makeObserved();

    // Register computed task that increments times but disposes itself if obj.a > 30
    let times = 0;
    computed(() => {
      if (obj.a > 30) {
        dispose();
      }
      times++;
    });
    // Ran immediately
    assert.strictEqual(times, 1);

    // Works fine if obj.a <= 30
    obj.a = 20;
    assert.strictEqual(times, 2);

    // Runs, realizes obj.a > 30, disposes
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
    const obj = makeObserved();

    // Task #1
    let times1 = 0;
    const fn1 = computed(() => {
      obj.b;
      times1++;
    });

    assert.strictEqual(times1, 1);

    // Task #2 (updates #1, disposes of #1 if obj.a > 50)
    let times2 = 0;
    const fn2 = computed(() => {
      // Trigger #1
      obj.b = obj.a;
      // Dispose of #1 if obj.a > 50
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

// Test various important reactivity edge cases such as special properties,
// prototypes, adding new properties, and re-observing objects
describe("reactivity edge cases", () => {

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
    const obj = makeObj();

    // Define "test" as non-enumerable
    Object.defineProperty(obj, "test", {
      enumerable: false,
      value: 10
    });

    // Observe the object
    observe(obj);

    // Verify non-reactivity of "test"
    let val;
    computed(() => val = obj.test);
    obj.test = 20;
    assert.strictEqual(val, 10);
  });

  it("non-configurable properties are not reactive", () => {
    const obj = makeObj();

    // Define "test" as non-configurable
    Object.defineProperty(obj, "test", {
      configurable: false,
      value: 10
    });

    observe(obj);

    let val;
    computed(() => val = obj.test);
    obj.test = 20;
    assert.strictEqual(val, 10);
  });

  it("observe will not re-reactify an object that is already reactive", () => {
    const obj = makeObj();

    // Observe the object
    observe(obj);

    // Make "a" non-reactive by re-defining it with a value of 0
    Object.defineProperty(obj, "a", {
      value: 0
    });

    // Re-observe the object (does nothing)
    observe(obj);

    // Verify the non-reactivity of "a"
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

  it("observe will make objects set onto a reactive property into reactive objects themselves", () => {
    // Create a reactive object
    const obj = makeObserved();

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

  it("arrays are not reactive", () => {
    // Create a reactive object with an array
    const obj = { arr: [1, 2, 3, 4] };
    observe(obj);

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
    const obj = makeObserved();

    // Add the new property "added", which will not be reactive as it was added
    // after creation
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
    const obj = makeObserved();
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

// Test issues with prototype name collisions (Luar versions >=1.1.0 have
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
                          // line will crash Luar versions >=1.1.0 with a
                          // cryptic error message
    assert.strictEqual(times, 2);
  });

  it("properties named __proto__ are ignored by observe", () => {
    // Create a new object with a __proto__ property
    const obj = Object.create(null);
    Object.defineProperty(obj, "__proto__", {
      value: 10
    });

    // Check that __proto__ was correctly set
    const overriddenPrototype = obj.__proto__;
    const actualPrototype = Object.getPrototypeOf(obj);
    assert.strictEqual(overriddenPrototype, 10);
    assert.strictEqual(actualPrototype, null);

    // Get the current __proto__ descriptor
    const getDescriptor = () => Object.assign({}, Object.getOwnPropertyDescriptor(obj, "__proto__"));
    const originalDescriptor = getDescriptor();

    // Reactify the object
    observe(obj);

    // Check that the __proto__ descriptor was left unchanged
    const observedDescriptor = getDescriptor();
    assert.deepEqual(originalDescriptor, observedDescriptor);

    // Attempt to attach a computed property to __proto__
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
