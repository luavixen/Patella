import chai from "chai";
const { assert } = chai;

import { observe, ignore, computed, dispose } from "../lib/patella.js";

suite("normal usage", () => {

  test("observed objects can have computed functions attached to them", () => {
    const doubler = observe({ number: 10, doubledNumber: undefined });
    computed(() => doubler.doubledNumber = doubler.number * 2);

    assert.strictEqual(doubler.doubledNumber, 20);
    doubler.number = 20;
    assert.strictEqual(doubler.doubledNumber, 40);
  });

  test("multiple computed functions attached to one reactive object", () => {
    const increments = observe({ x: 0, y: 0, z: 0 });
    computed(() => increments.y = increments.x + 1);
    computed(() => increments.z = increments.y + 1);

    assert.deepEqual(increments, { x: 0, y: 1, z: 2 });
    increments.x = 30;
    assert.deepEqual(increments, { x: 30, y: 31, z: 32 });
  });

  test("one computed function attached to multiple reactive objects", () => {
    const word1 = observe({ word: "Hello" });
    const word2 = observe({ word: "world" });
    let sentence; computed(() => sentence = word1.word + " " + word2.word);

    assert.strictEqual(sentence, "Hello world");
    word2.word = "you";
    assert.strictEqual(sentence, "Hello you");
  });

  test("computed functions can depend on multiple properties of a reactive object", () => {
    const myName = observe({
      fullName: "",
      firstName: "",
      middleNames: [],
      lastName: ""
    });
    computed(() => {
      const names = [];

      if (myName.firstName) names.push(myName.firstName);
      names.push(...myName.middleNames);
      if (myName.lastName) names.push(myName.lastName);

      myName.fullName = names.join(" ");
    });

    assert.strictEqual(myName.fullName, "");
    myName.firstName = "Lua";
    assert.strictEqual(myName.fullName, "Lua");
    myName.lastName = "MacDougall";
    assert.strictEqual(myName.fullName, "Lua MacDougall");
    myName.middleNames.push("\"WTF\""); // Does not notify dependencies
    myName.middleNames = myName.middleNames; // Forcefully notifies dependencies
    assert.strictEqual(myName.fullName, "Lua \"WTF\" MacDougall");
  });

  test("observe is recursive and will make subobjects reactive", () => {
    const coolness = observe({
      you: { cool: false },
      me: { cool: true },
      superCool: false
    });
    computed(() => coolness.superCool = coolness.you.cool && coolness.me.cool);

    assert.isFalse(coolness.superCool);
    coolness.you.cool = true;
    assert.isTrue(coolness.superCool);
  });

  test("setting an object onto a reactive property makes the object reactive", () => {
    const summit = observe({ nums: null, total: null });
    summit.nums = { a: 10, b: 20, c: 30 };
    computed(() =>
      summit.total =
        summit.nums.a
        + summit.nums.b
        + summit.nums.c
    );

    assert.strictEqual(summit.total, 60);
    summit.nums.b -= 10;
    assert.strictEqual(summit.total, 50);
  });

  test("setting an object onto a reactive property makes the entire object tree reactive", () => {
    const config = observe({ db: null });
    const db = {
      location: "mongodb://192.168.1.24"
    };
    const login = db.login = {
      user: "example",
      password: "password123!",
      string: ""
    };
    config.db = db;
    computed(() => config.db.login.string = config.db.login.user + ":" + config.db.login.password);

    assert.strictEqual(config.db.login.string, "example:password123!");
    login.password = "nottelling12";
    assert.strictEqual(config.db.login.string, "example:nottelling12");
  });

  test("multiple (implicitly) reactive objects with one computed function using iterators", () => {
    const nums = observe({ x: null, y: null, z: null, product: null });
    const numSet = () => ({ a: 10, b: 20, c: 30 });
    nums.x = numSet();
    nums.y = numSet();
    nums.z = numSet();
    computed(() => {
      let product;
      for (var numKey in nums) {
        var numSet = nums[numKey];
        for (var key in numSet) {
          product = product ? product * numSet[key] : numSet[key];
        }
      }
      nums.product = product;
    });

    assert.strictEqual(nums.product, 216000000000);
    nums.y.b += 2;
    assert.strictEqual(nums.product, 237600000000);
  });

  test("replace objects in reactive properties works as expected (but may leak the old object)", () => {
    const database = observe({ user: null });
    database.user = {
      login: "luawtf",
      password: "uwu",
      attempt: { password: null, correct: false }
    };
    computed(() =>
      database.user.attempt.correct =
        database.user.attempt.password === database.user.password
    );

    assert.isFalse(database.user.attempt.correct);
    database.user.attempt.password = "uwu";
    assert.isTrue(database.user.attempt.correct);
    // Next line is bad practice, will leak the original `database.user.attempt`
    // as the computed function still depends on it, consider cleaning up using
    // dispose (clean mode) and then computed
    database.user.attempt = { password: "owo", correct: true };
    assert.isFalse(database.user.attempt.correct);
    database.user.attempt.password = "uwu";
    assert.isTrue(database.user.attempt.correct);
  });

  test("ignored objects are still valid and can be used in reactive properties", () => {
    const summers = observe({
      sum1: { a: null, b: null, sum: null },
      sum2: ignore({ a: null, b: null, sum: null })
    });
    const summer = sumObject =>
      computed(() => sumObject.sum = sumObject.a + sumObject.b);
    summer(summers.sum1);
    summer(summers.sum2);

    assert.deepEqual(summers, {
      sum1: { a: null, b: null, sum: 0 },
      sum2: { a: null, b: null, sum: 0 }
    });
    summers.sum1.a = 10;
    summers.sum1.b = 20;
    assert.strictEqual(summers.sum1.sum, 30);
    summers.sum2.a = 10;
    summers.sum2.b = 20;
    assert.strictEqual(summers.sum2.sum, 0);
  });

  test("ignore can be used to replace objects in reactive properties without leaking", () => {
    const vectors = observe({
      v1: ignore({}),
      v2: ignore({}),
      sum: null,
      product: null
    });
    computed(() =>
      vectors.sum = ignore({
        x: vectors.v1.x + vectors.v2.x,
        y: vectors.v1.y + vectors.v2.y,
        z: vectors.v1.z + vectors.v2.z
      })
    );
    computed(() =>
      vectors.product = ignore({
        x: vectors.v1.x * vectors.v2.x,
        y: vectors.v1.y * vectors.v2.y,
        z: vectors.v1.z * vectors.v2.z
      })
    );

    assert.deepEqual(vectors, {
      v1: {}, v2: {},
      sum: { x: NaN, y: NaN, z: NaN },
      product: { x: NaN, y: NaN, z: NaN }
    });
    vectors.v1 = ignore({ x: 20, y: 0, z: 0 });
    vectors.v2 = ignore({ x: 20, y: 20, z: 20 });
    assert.deepEqual(vectors.sum, { x: 40, y: 20, z: 20 });
    assert.deepEqual(vectors.product, { x: 400, y: 0, z: 0});
  });

  test("ignored objects are not reactive", () => {
    const squarer = observe({
      numberToSquare: ignore({ number: 10 }),
      square: null
    });
    const squareComputer = computed(() => {
      squarer.square = squarer.numberToSquare.number ** 2;
    });

    assert.strictEqual(squarer.square, 100);
    squarer.numberToSquare.number = 8;
    assert.strictEqual(squarer.square, 100);
    computed(squareComputer);
    assert.strictEqual(squarer.square, 64);
  });

  test("computed functions will notify eachother continuously", () => {
    const telephone = observe({
      one: null,
      two: null,
      three: null,
      four: null,
      five: null,
      six: null
    });
    computed(() => telephone.two = telephone.one);
    computed(() => telephone.three = telephone.two);
    computed(() => telephone.four = telephone.three);
    computed(() => telephone.five = telephone.four);
    computed(() => telephone.six = telephone.five);

    assert.deepEqual(Object.values(telephone), [,,,,,,].fill(null));
    telephone.one = "Hello!";
    assert.deepEqual(Object.values(telephone), [,,,,,,].fill("Hello!"));
    telephone.one = 1;
    assert.deepEqual(Object.values(telephone), [,,,,,,].fill(1));
  });

  test("computed functions created&notified inside of another computed function (nested) are not executed immediately but added to the queue", () => {
    let executed = false;
    computed(() => {
      computed(() => {
        executed = true;
      });
      assert.isFalse(executed);
    });
    assert.isTrue(executed);
  });

  test("nested computed functions do not share dependencies", () => {
    const updateCounter = observe({
      multiplyBy: 2,
      valueToMultiply: 2,
      timesUpdated: 0
    });
    computed(() => {
      computed(() => {
        updateCounter.valueToMultiply *= updateCounter.multiplyBy;
      });
      updateCounter.timesUpdated++;
    });

    assert.strictEqual(updateCounter.timesUpdated, 1);
    assert.strictEqual(updateCounter.valueToMultiply, 4);
    updateCounter.multiplyBy = 4;
    assert.strictEqual(updateCounter.timesUpdated, 1);
    assert.strictEqual(updateCounter.valueToMultiply, 16);
    updateCounter.multiplyBy = 2;
    assert.strictEqual(updateCounter.timesUpdated, 1);
    assert.strictEqual(updateCounter.valueToMultiply, 32);
    updateCounter.multiplyBy = 5;
    assert.strictEqual(updateCounter.timesUpdated, 1);
    assert.strictEqual(updateCounter.valueToMultiply, 160);
  });

  test("nested computed functions where the inner function notifies the outer function will cause chaos", () => {
    const chaos = observe({ x: 10 });
    computed(() => {
      chaos.x;
      computed(() => {
        if (chaos.x < 100) chaos.x++;
      });
    });

    assert.strictEqual(chaos.x, 100);
  });

  test("dispose removes all the dependencies from a computed function", () => {
    const numberCopier = observe({
      in: 0,
      out: 0
    });
    const numberCopierComputer = computed(() => {
      numberCopier.out = numberCopier.in;
    });

    assert.strictEqual(numberCopier.out, 0);
    numberCopier.in = 10;
    assert.strictEqual(numberCopier.out, 10);
    dispose(numberCopierComputer);
    numberCopier.in = 20;
    assert.strictEqual(numberCopier.out, 10);
  });

  test("dispose disposes and returns its first argument", () => {
    const counter = observe({
      value: 0,
      times: 0
    });
    computed(dispose(() => { // Does nothing, as computed ignores disposed funcs
      counter.value;
      counter.times++;
    }));

    assert.strictEqual(counter.times, 0);
    counter.value++;
    assert.strictEqual(counter.times, 0);
  });

  test("disposed functions cannot be manually notified", () => {
    const concat = observe({ start: "", end: "", full: "" });
    const concatComputed = computed(() => concat.full = concat.start + concat.end);

    assert.strictEqual(concat.full, "");
    concat.start = "Hello, ";
    concat.end = "world!";
    assert.strictEqual(concat.full, "Hello, world!");
    dispose(concatComputed);
    concat.start = "Goodbye, ";
    assert.strictEqual(concat.full, "Hello, world!");
    computed(concatComputed);
    concat.start = concat.start;
    assert.strictEqual(concat.full, "Hello, world!");
  });

  test("dispose called without an argument uses the current computed function", () => {
    const countToFour = observe({
      number: 0
    });
    function countByOne() {
      countToFour.number++;
      if (countToFour.number === 4) dispose();
    }

    assert.strictEqual(countToFour.number, 0);
    computed(countByOne);
    assert.strictEqual(countToFour.number, 1);
    computed(countByOne);
    assert.strictEqual(countToFour.number, 2);
    computed(countByOne);
    assert.strictEqual(countToFour.number, 3);
    computed(countByOne);
    assert.strictEqual(countToFour.number, 4);
    computed(countByOne); // No longer reactive
    assert.strictEqual(countToFour.number, 4);
  });

  test("dispose can be called in \"clean mode\" which removes all dependencies but allows the computed function to be notified manually", () => {
    const rooter = observe({
      in: 0,
      out: 0
    });
    function rooterComputer() {
      rooter.out = Math.sqrt(rooter.in);
    }
    computed(rooterComputer);

    assert.strictEqual(rooter.out, 0);
    rooter.in = 64;
    assert.strictEqual(rooter.out, 8);
    dispose(rooterComputer, true);
    rooter.in = 4;
    assert.strictEqual(rooter.out, 8);
    computed(rooterComputer);
    assert.strictEqual(rooter.out, 2);
  });

  test("dispose usage in both clean and default mode", () => {
    const multiply = observe({ left: 0, right: 0, result: 0 });
    const divide = observe({ left: 0, right: 0, result: 0 });
    const computer = computed(() => {
      multiply.result = multiply.left * multiply.right;
      divide.result = divide.left / divide.right;
    });

    assert.strictEqual(multiply.result, 0);
    assert.isNaN(divide.result);
    multiply.left = 10;
    multiply.right = 2;
    assert.strictEqual(multiply.result, 20);
    divide.left = 4;
    divide.right = 2;
    assert.strictEqual(divide.result, 2);
    dispose(computer, true);
    multiply.left = 20;
    assert.strictEqual(multiply.result, 20);
    divide.left = 8;
    assert.strictEqual(divide.result, 2);
    computed(computer);
    assert.strictEqual(multiply.result, 40);
    assert.strictEqual(divide.result, 4);
    multiply.right = 3;
    assert.strictEqual(multiply.result, 60);
    divide.right = 3;
    assert.strictEqual(divide.result, 8 / 3);
    dispose(computer);
  });

  test("disposing a computed function that was notified (with execution pending) will cause it to be removed from the queue", () => {
    const power = observe({ in: 0, pow2: 0, pow4: 0 });
    function pow2() {
      power.pow2 = power.in ** 2;
      if (power.pow2 >= 64) dispose(pow4);
    }
    function pow4() {
      power.pow4 = power.pow2 ** 2;
    }
    computed(pow2);
    computed(pow4);

    assert.deepEqual(power, { in: 0, pow2: 0, pow4: 0 });
    power.in = 4;
    assert.deepEqual(power, { in: 4, pow2: 16, pow4: 256 });
    power.in = 6;
    assert.deepEqual(power, { in: 6, pow2: 36, pow4: 1296 });
    power.in = 8;
    assert.deepEqual(power, { in: 8, pow2: 64, pow4: 1296 });
    power.in = 6;
    assert.deepEqual(power, { in: 6, pow2: 36, pow4: 1296 });
  });

});

suite("causing problems :)", () => {

  const nonObjects = [
    undefined, null, false, true,
    0, 1, -1, 0.5, -0.5,
    "", "Hello, world.",
    0n, 1n, 1_000_000_000_000_000_000_000_000_000_000n,
    Symbol(), Symbol("Example"),
  ];

  const nonFunctions = [
    ...nonObjects,
    {}, { x: 10, y: true }, { obj: { hello() {} }, goodbye() {} },
    new Date(), new RegExp("test"), new Map()
  ];

  test("observe doesnt like when its first argument is not an object", () => {
    nonObjects.forEach(val => assert.throws(() => observe(val)));
  });

  test("ignore also hates arguments that arent objects", () => {
    nonObjects.forEach(val => assert.throws(() => ignore(val)));
  });

  test("computed isnt fond of arguments that dont implement [[Call]]", () => {
    nonFunctions.forEach(val => assert.throws(() => computed(val)));
  });

  test("computed complains if you create an infinite loop with two computed functions that trigger eachother", () => {
    const object = observe({ x: 10, y: 20 });
    computed(() => {
      object.x = object.y + 1;
    });
    function oops() {
      object.y = object.x + 1;
    }

    assert.throws(() => computed(oops));
  });

  test("dispose wont eat arguments that arent functions because they taste bad", () => {
    nonFunctions.forEach(val => assert.throws(() => dispose(val)));
  });

  test("dispose will get mad if you call it without any arguments outside of a computed function", () => {
    assert.throws(() => dispose());
  });

});

suite("edge cases", () => {

  test("properties added after observation are not reactive", () => {
    const object = observe({});
    object.val = 10;
    let val; computed(() => val = object.val);

    assert.strictEqual(val, 10);
    object.val = 20; // Not reactive
    assert.strictEqual(val, 10);
  });

  test("objects cannot be reobserved to make properties added after observation reactive", () => {
    const object = observe({});
    object.val = 10;
    observe(object); // Does nothing
    let val; computed(() => val = object.val);

    assert.strictEqual(val, 10);
    object.val = 20; // Not reactive
    assert.strictEqual(val, 10);
  });

  test("observe does not reactify prototypes", () => {
    const object = observe(Object.setPrototypeOf({ x: 10 }, { y: 20 }));
    let times = 0; computed(() => (object.x, object.y, times++));

    assert.strictEqual(object.x, 10);
    assert.strictEqual(object.y, 20);
    assert.strictEqual(times, 1);

    object.x = 30;
    assert.strictEqual(times, 2);
    object.y = 30; // Not reactive
    assert.strictEqual(times, 2);
    object.x = 50;
    assert.strictEqual(times, 3);
    object.y = 100; // Not reactive
    assert.strictEqual(times, 3);
  });

  test("prototypes can be observed but their children will not be made reactive", () => {
    const object = Object.setPrototypeOf({ x: 10 }, observe({ y: 20 }));
    let times = 0; computed(() => (object.x, object.y, times++));

    assert.strictEqual(object.x, 10);
    assert.strictEqual(object.y, 20);
    assert.strictEqual(times, 1);

    object.x = 30; // Not reactive
    assert.strictEqual(times, 1);
    object.y = 30;
    assert.strictEqual(times, 2);
    object.x = 50; // Not reactive
    assert.strictEqual(times, 2);
    object.y = 100;
    assert.strictEqual(times, 3);
  });

  test("properties that share names with Object.prototype properties work as expected", () => {
    const object = observe({ hasOwnProperty: 10 });
    let val; computed(() => val = object.hasOwnProperty);

    assert.strictEqual(val, 10);
    object.hasOwnProperty = 20;
    assert.strictEqual(val, 20);
  });

  test("nonconfigurable properties will not be made reactive", () => {
    const object = observe(Object.defineProperty({}, "val", {
      configurable: false,
      enumerable: true,
      writable: true,
      value: 10
    }));
    let val; computed(() => val = object.val);

    assert.strictEqual(val, 10);
    object.val = 20; // Not reactive
    assert.strictEqual(val, 10);
  });

  test("nonenumerable properties will not be made reactive", () => {
    const object = observe(Object.defineProperty({}, "val", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: 10
    }));
    let val; computed(() => val = object.val);

    assert.strictEqual(val, 10);
    object.val = 20; // Not reactive
    assert.strictEqual(val, 10);
  });

  test("nonwritable but enumerable and configurable properties will be overwritten", () => {
    const object = observe(Object.defineProperty({}, "val", {
      configurable: true,
      enumerable: true,
      writable: false,
      value: 10
    }));

    assert.strictEqual(object.val, 10);
    object.val = 20;
    assert.strictEqual(object.val, 20);
  });

  test("getter/setter properties will be accessed then overwritten", () => {
    let accessCount = 0;
    const object = {
      get val() {
        accessCount++;
        return 10;
      }
    };

    assert.strictEqual(accessCount, 0);
    object.val;
    assert.strictEqual(accessCount, 1);
    observe(object);
    assert.strictEqual(accessCount, 2);
    object.val; // Overwritten by observe
    assert.strictEqual(accessCount, 2);
  });

  test("properties named __proto__ will not be made reactive", () => {
    const object = Object.defineProperty(Object.create(null), "__proto__", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: 10
    });

    object.__proto__ = 20;
    assert.strictEqual(object.__proto__, 20);
    assert.strictEqual(Object.getPrototypeOf(object), null);

    const descriptor = () => Object.assign({}, Object.getOwnPropertyDescriptor(object, "__proto__"));

    const originalDescriptor = descriptor();
    observe(object);
    const observedDescriptor = descriptor();

    assert.deepEqual(observedDescriptor, originalDescriptor);
  });

  test("arrays are not reactive", () => {
    const object = observe({ array: [1, 2, 3] });
    let times = 0; computed(() => (object.array[1], times++));

    assert.strictEqual(times, 1);
    object.array[1] = 4; // Not reactive
    assert.strictEqual(times, 1);
    object.array.pop();
    object.array.pop();
    object.array.push(3); // Still not reactive :P (no array function hacks)
    assert.strictEqual(times, 1);
    object.array[1] = 10;
    object.array = object.array; // There we go!
    assert.strictEqual(times, 2);
  });

  suite("argument returns", () => {

    test("observe returns its first argument", () => {
      const object = {};
      assert.strictEqual(observe(object), object);
      assert.strictEqual(observe(observe(object)), object);
    });

    test("ignore returns its first argument", () => {
      const object = {};
      assert.strictEqual(ignore(object), object);
      assert.strictEqual(ignore(ignore(object)), object);
    });

    test("computed returns its first argument", () => {
      function func() {}
      assert.strictEqual(computed(func), func);
      assert.strictEqual(computed(computed(func)), func);
    });

    test("dispose returns its first argument", () => {
      function func() {}
      assert.strictEqual(dispose(func), func);
      assert.strictEqual(dispose(dispose(func)), func);
    });

    test("dispose returns nothing if called without a valid first argument", () => {
      computed(() => {
        assert.isUndefined(dispose());
        assert.isUndefined(dispose(null));
        assert.isUndefined(dispose(undefined));
        assert.isUndefined(dispose(null, null));
        assert.isUndefined(dispose(null, undefined));
        assert.isUndefined(dispose(null, false));
        assert.isUndefined(dispose(null, true));
        assert.isUndefined(dispose(undefined, null));
        assert.isUndefined(dispose(undefined, undefined));
        assert.isUndefined(dispose(undefined, false));
        assert.isUndefined(dispose(undefined, true));
      });
    });

  });

  suite("observed object compatibility", () => {

    test("reactive properties can be get/set like normal", () => {
      const object = observe({ value: 10 });

      assert.strictEqual(object.value, 10);
      object.value = 20;
      assert.strictEqual(object.value, 20);
      object.value = { x: 10 };
      assert.deepEqual(object.value, { x: 10 });
      object.value += 10;
      assert.strictEqual(object.value, "[object Object]10");
    });

    test("observed objects can be iterated through and spread", () => {
      const objectObserved = observe({ a: 10, b: 20, c: 30 });
      const objectSpread = { ...objectObserved };
      const objectIdentical = { a: 10, b: 20, c: 30 };

      assert.deepEqual(objectObserved, objectSpread);
      assert.deepEqual(objectObserved, objectIdentical);
      assert.deepEqual(objectSpread, objectIdentical);

      const keysExpected = ["a", "b", "c"];

      let keys = []; for (const key in objectObserved) keys.push(key);
      assert.deepEqual(keys, keysExpected);

      assert.deepEqual(Object.keys(objectObserved), keysExpected);
      assert.deepEqual(Object.values(objectObserved), [10, 20, 30]);
    });

    test("observed objects can have cyclic references", () => {
      const object1 = { object2: undefined, value: !0 };
      const object2 = { object1: undefined, value: !1 };
      object1.object2 = object2;
      object2.object1 = object1;

      observe(object1);

      assert.strictEqual(object1.object2, object2);
      assert.strictEqual(object2.object1, object1);
      assert.strictEqual(object1.object2.object1, object1);
      assert.strictEqual(object2.object1.object2, object2);
      assert.strictEqual(object1.object2.object1.object2.object1.object2, object2);

      assert.strictEqual(object1.object2.object1.object2.object1.value, true);
      assert.strictEqual(object2.object1.object2.object1.object2.value, false);
    });

  });

  suite("reactive functions", () => {

    test("functions can be made reactive", () => {
      function func() {}
      func.x = 10;
      observe(func);

      let times = 0; computed(() => (func.x, times++));

      assert.strictEqual(times, 1);
      func.x++;
      assert.strictEqual(times, 2);
    });

    test("reactive functions can be called", () => {
      let value;
      function func(newValue) {
        value = newValue;
      }

      observe(func);

      func(50);
      assert.strictEqual(value, 50);
    });

    test("functions are exempt from recursive reactivity", () => {
      function func() {}
      func.x = 10;
      const object = observe({ func });

      let times = 0; computed(() => (object.func.x, times++));

      assert.strictEqual(times, 1);
      object.func.x++;
      assert.strictEqual(times, 1);
    });

    test("functions are exempt from implicit reactivity", () => {
      function func() {}
      func.x = 10;
      const object = observe({ func: null });
      object.func = func;

      let times = 0; computed(() => (object.func.x, times++));

      assert.strictEqual(times, 1);
      object.func.x++;
      assert.strictEqual(times, 1);
    });

  });

  suite("order of execution", () => {

    test("computed functions execute in the order they are notified", () => {
      const values = [];
      const func1 = () => values.push(1);
      const func2 = () => values.push(2);
      const func3 = () => values.push(3);
      const func4 = () => values.push(4);
      computed(() => {
        computed(func2);
        computed(func4);
        computed(func1);
        computed(func3);
        assert.deepEqual(values, []);
      });

      assert.deepEqual(values, [2,4,1,3]);
    });

    test("computed functions can be notified multiple times but cannot be queued multiple times", () => {
      const values = [];
      const func1 = () => values.push(1);
      const func2 = () => values.push(2);
      const func3 = () => values.push(3);
      const func4 = () => values.push(4);

      computed(func1);
      computed(func2);
      computed(func1);
      computed(func3);
      computed(func4);
      computed(func3);
      assert.deepEqual(values, [1,2,1,3,4,3]);

      values.length = 0;
      computed(() => {
        computed(func1);
        computed(func2);
        computed(func1);
        computed(func3);
        computed(func4);
        computed(func3);
        assert.deepEqual(values, []);
      });
      assert.deepEqual(values, [1,2,3,4]);
    });

    test("disposing queued computed functions preserves the queue order", () => {
      const values = [];
      const func1 = () => { values.push(1); };
      const func2 = () => { values.push(2); };
      const func3 = () => { values.push(3); };
      const func4 = () => { values.push(4); dispose(func3) };
      const func5 = () => { values.push(5); };

      computed(() => {
        computed(func1);
        computed(func4);
        computed(func3);
        computed(func5);
        computed(func2);
      });
      assert.deepEqual(values, [1,4,5,2]);
    });

    test("object dependencies are notified in the order they are added", () => {
      const object = observe({ x: 10 });

      const values = [];
      const func1 = () => { object.x; values.push(1); };
      const func2 = () => { object.x; values.push(2); };
      const func3 = () => { object.x; values.push(3); };
      const func4 = () => { object.x; values.push(4); };

      computed(func2);
      computed(func3);
      computed(func1);
      computed(func4);
      assert.deepEqual(values, [2,3,1,4]);

      values.length = 0;
      object.x++;
      assert.deepEqual(values, [2,3,1,4]);
    });

    test("object dependencies are always notified in the order they are added, even when multiple objects get involved", () => {
      const object1 = observe({ x: 10 });
      const object2 = observe({ x: 10 });

      const values = [];
      let ignoreTwo = true;
      const createFunc = num => () => {
        object1.x, ignoreTwo || object2.x;
        values.push(num);
      };
      const func1 = createFunc(1);
      const func2 = createFunc(2);
      const func3 = createFunc(3);
      const func4 = createFunc(4);

      computed(func3);
      computed(func2);
      computed(func4);
      computed(func1);
      ignoreTwo = false;
      computed(func1);
      computed(func2);
      computed(func3);
      computed(func4);

      values.length = 0;
      object1.x++;
      assert.deepEqual(values, [3,2,4,1]);

      values.length = 0;
      object2.x++;
      assert.deepEqual(values, [1,2,3,4]);
    });

    test("disposing a dependant computed function preserves the order of the dependencies", () => {
      const object = observe({ x: 10 });

      const values = [];
      const func1 = () => { object.x; values.push(1); };
      const func2 = () => { object.x; values.push(2); };
      const func3 = () => { object.x; values.push(3); };
      const func4 = () => { object.x; values.push(4); };

      computed(func3);
      computed(func2);
      computed(func4);
      computed(func1);
      dispose(func4);

      values.length = 0;
      object.x++;
      assert.deepEqual(values, [3,2,1]);
    });

  });

});
