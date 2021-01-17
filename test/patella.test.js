import chai from "chai";
const { assert } = chai;

import { observe, ignore, computed, dispose } from "../lib/patella.js";


suite("common reactivity", () => {

  test("", () => {
    const doubler = observe({ number: 10, doubledNumber: undefined });
    computed(() => doubler.doubledNumber = doubler.number * 2);

    assert.equal(doubler.doubledNumber, 20);
    doubler.number = 20;
    assert.equal(doubler.doubledNumber, 40);
  });

  test("", () => {
    const increments = observe({ x: 0, y: 0, z: 0 });
    computed(() => increments.y = increments.x + 1);
    computed(() => increments.z = increments.y + 1);

    assert.deepEqual(increments, { x: 0, y: 1, z: 2 });
    increments.x = 30;
    assert.deepEqual(increments, { x: 30, y: 31, z: 32 });
  });

  test("", () => {
    const word1 = observe({ word: "Hello" });
    const word2 = observe({ word: "world" });
    let sentence; computed(() => sentence = word1.word + " " + word2.word);

    assert.equal(sentence, "Hello world");
    word2.word = "you";
    assert.equal(sentence, "Hello you");
  });

  test("", () => {
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

    assert.equal(myName.fullName, "");
    myName.firstName = "Lua";
    assert.equal(myName.fullName, "Lua");
    myName.lastName = "MacDougall";
    assert.equal(myName.fullName, "Lua MacDougall");
    myName.middleNames.push("\"WTF\""); // Does not notify dependencies
    myName.middleNames = myName.middleNames; // Forcefully notifies dependencies
    assert.equal(myName.fullName, "Lua \"WTF\" MacDougall");
  });

  test("", () => {
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

  test("", () => {
    const summit = observe({ nums: null, total: null });
    summit.nums = { a: 10, b: 20, c: 30 };
    computed(() =>
      summit.total =
        summit.nums.a
        + summit.nums.b
        + summit.nums.c
    );

    assert.equal(summit.total, 60);
    summit.nums.b -= 10;
    assert.equal(summit.total, 50);
  });

  test("", () => {
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

    assert.equal(nums.product, 216000000000);
    nums.y.b += 2;
    assert.equal(nums.product, 237600000000);
  });

  test("", () => {
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
    database.user.attempt = { password: "owo", correct: true }; // BAD
    assert.isFalse(database.user.attempt.correct);
    database.user.attempt.password = "uwu";
    assert.isTrue(database.user.attempt.correct);
  });

  test("", () => {
    const summers = observe({
      sum1: { a: null, b: null, sum: null },
      sum2: ignore({ a: null, b: null, sum: null })
    });
    const summer = sumObject =>
      void computed(() => sumObject.sum = sumObject.a + sumObject.b);
    summer(summers.sum1);
    summer(summers.sum2);

    assert.deepEqual(summers, {
      sum1: { a: null, b: null, sum: 0 },
      sum2: { a: null, b: null, sum: 0 }
    });
    summers.sum1.a = 10;
    summers.sum1.b = 20;
    assert.equal(summers.sum1.sum, 30);
    summers.sum2.a = 10;
    summers.sum2.b = 20;
    assert.equal(summers.sum2.sum, 0);
  });

  test("", () => {
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

  test("", () => {
    const squarer = observe({
      numberToSquare: ignore({ number: 10 }),
      square: null
    });
    const squareComputer = computed(() => {
      squarer.square = squarer.numberToSquare.number ** 2;
    });

    assert.equal(squarer.square, 100);
    squarer.numberToSquare.number = 8;
    assert.equal(squarer.square, 100);
    computed(squareComputer);
    assert.equal(squarer.square, 64);
  });

  test("", () => {
    let executed = false;
    computed(() => {
      computed(() => {
        executed = true;
      });
      assert.isFalse(executed);
    });
    assert.isTrue(executed);
  });

  test("", () => {
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

    assert.equal(updateCounter.timesUpdated, 1);
    assert.equal(updateCounter.valueToMultiply, 4);
    updateCounter.multiplyBy = 4;
    assert.equal(updateCounter.timesUpdated, 1);
    assert.equal(updateCounter.valueToMultiply, 16);
    updateCounter.multiplyBy = 2;
    assert.equal(updateCounter.timesUpdated, 1);
    assert.equal(updateCounter.valueToMultiply, 32);
    updateCounter.multiplyBy = 5;
    assert.equal(updateCounter.timesUpdated, 1);
    assert.equal(updateCounter.valueToMultiply, 160);
  });

  test("", () => {
    const chaos = observe({ x: 10 });
    computed(() => {
      chaos.x;
      computed(() => {
        if (chaos.x < 100) chaos.x++;
      });
    });

    assert.equal(chaos.x, 100);
  });

});
