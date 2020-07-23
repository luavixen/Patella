<p align="center">
  <a href="https://www.npmjs.com/package/luar">
    <img src="https://img.shields.io/npm/v/luar?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/luar?activeTab=dependencies">
    <img src="https://img.shields.io/badge/dependencies-none-blue?style=flat-square">
  </a>
  <a href="https://bundlephobia.com/result?p=luar">
    <img src="https://img.shields.io/bundlephobia/minzip/luar?style=flat-square">
  </a>
  <a href="https://github.com/luawtf/Luar/actions">
    <img src="https://img.shields.io/github/workflow/status/luawtf/Luar/continuous%20integration/master?style=flat-square">
  </a>
  <a href="https://coveralls.io/github/luawtf/Luar">
    <img src="https://img.shields.io/coveralls/github/luawtf/Luar?style=flat-square">
  </a>
  <a href="https://github.com/luawtf/Luar/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/luawtf/Luar?style=flat-square">
  </a>
</p>

<h2 align="center">Luar &#x1F501;</h2>
<p align="center"><i>
  Luar provides unctions for facilitating simple <a href="https://wikipedia.org/wiki/Reactive_programming">reactive programming</a> in JavaScript, inspired by Vue.js and Hyperactiv.
  Luar is compatible with ECMAScript 5 (2009) and up and functions without issue on Internet Explorer 8 and newer.
</i></p>

## Description
Luar is a simple and concise implementation of the reactive programming paradigm for JavaScript (with included TypeScript support).
It is compatible with almost any browser released since 2010 and is also very small, weighing at around 800 bytes when minified and gzipped, it only contains about 300 lines of code.

Luar provides functions for "observing" JavaScript objects and for creating functions that are "computed" (known as computed tasks) which operate on the data inside of those objects.
When the data in an observed object updates, any computed tasks that depend on that data are re-run.
I find this functionality most useful for MVC (Model-View-Controller) style declarative UI creation!

On that note, let's use Luar to make a reactive webpage that says hello to a user:
```html
<h2 id="hello-message"></h2>
<input type="text" oninput="model.first = value">
<input type="text" oninput="model.last = value">

<script>
  const elem = document.findElementById("hello-message");

  // Our model object contains first and last fields
  const model = observe({ first: "", last: "" });
  // "Declare" that the element's inner text should be something like Hello, first last!
  computed(() => elem.innerText = `Hello, ${model.first} ${model.last}!`);
</script>
```
Now the `hello-message` header will say hello to the user, updating its content as soon as the model changes (on input)!
This is known as "declarative UI", where you declare the content of your UI and how it connects to your data, and the UI updates \~reactively\~.
You can [view this example on JSFiddle](https://jsfiddle.net/luawtf/ghbtvexo/).

## Installation
Luar is available on [NPM](https://www.npmjs.com/package/luar):
```sh
npm install luar
```
```javascript
import { observe, computed } from "luar";
```
Or, for people working without a bundler, it can be included from [UNPKG](https://www.unpkg.com/browse/luar@latest/):
```html
<script src="https://unpkg.com/luar"></script>
<script>
  Luar.observe({});
  Luar.computed(function () {});
</script>
```

## Usage
 - [1. Basic reactivity](#1-basic-reactivity)
 - [2. Multiple objects and computed properties](#2-multiple-objects-and-computed-properties)
 - [3. Deep reactivity and implicit observation](#3-deep-reactivity-and-implicit-observation)
 - [4. Cleaning up](#4-cleaning-up)
 - [5. Reactivity pitfalls](#5-reactivity-pitfalls)

### 1. Basic reactivity
```javascript
let coords = { x: 10, y: 20 };
let z = x + y;

console.log(z); // Output: "30" ✔

coords.x += 10;
coords.y = 21;

console.log(z); // Output: "30" ✘
```

```javascript
let coords = observe({ x: 10, y: 20 });
let z; computed(() => z = x + y);

console.log(z); // Output: "30" ✔

coords.x += 10;
coords.y = 21;

console.log(z); // Output: "41" ✔
```

### 2. Multiple objects and computed properties
```javascript
// Setting up some reactive objects that contain some data about a specific US president ...
const person = observe({
  name: { first: "George", last: "Washington" },
  age: 288
});
const account = observe({
  user: "big-george12",
  password: "IHateTheQueen!1"
});

// Declare that we will output a log message whenever person.name.first, account.user, or person.age are updated
computed(() => console.log(
  `${person.name.first}'s username is ${account.user} (${person.age} years old)`
)); // Output "George's username is big-george12 (288 years old)"

// Update one of the dependents
account.password = "not-telling"; // Does not output (no computed task depends on this)

// All operators work
account.user += "3"; // Output "George's username is big-george123 (288 years old)"
person.age++; // Output "George's username is big-george123 (289 years old)"

// You can even replace objects (and arrays) entirely!
// This will automatically observe this new object and will correctly carry across any dependent computed tasks
person.name = {
  first: "Abraham",
  last: "Lincoln"
}; // Output "Abraham's username is big-george123 (289 years old)"
```

```javascript
// Create our nums object, with some default values for properties that will be computed
const nums = observe({
  a: 33, b: 23, c: 84,
  x: 0,
  sumAB: 0, sumAX: 0, sumCX: 0,
  sumAllSums: 0
});

// Declare that (x) will be equal to (a + b + c)
computed(() => nums.x = nums.a + nums.b + nums.c);
// Declare that (sumAB) will be equal to (a + b)
computed(() => nums.sumAB = nums.a + nums.b);
// Declare that (sumAX) will be equal to (a + x)
computed(() => nums.sumAX = nums.a + nums.x);
// Declare that (sumCX) will be equal to (c + x)
computed(() => nums.sumCX = nums.c + nums.x);
// Declare that (sumAllSums) will be equal to (sumAB + sumAX + sumCX)
computed(() => nums.sumAllSums = nums.sumAB + nums.sumAX + nums.sumCX);

// Now lets check the (sumAllSums) value
console.log(nums.sumAllSums); // Output "453"

// Notice that when we update one value ...
nums.c += 2;
// ... all the other values update! (since we declared them as such)
console.log(nums.sumAllSums); // Output "459"
```

### 3. Deep reactivity and implicit observation
```javascript
const eventSummary = observe({
  title: "Important Meeting #283954",
  description: "Will be meeting with the president of BigImportantFirmCo to talk business",
  summary: null,
  guestInfo: {
    you:        { name: "",         id: 7999782267 },
    president:  { name: "Mr. Firm", id: 4160971388 }
  }
});

computed(() =>
  console.log("" + evenSummary.description)
); // Output "Will be meeting with the president of BigImportantFirmCo to talk business"

eventSummary.description = {
  short: "Will be meeting with the president of ...",
  full: "Will be meeting with the president of BigImportantFirmCo to talk business.\nMake sure to arrive by 11:30!",
  toString() {
    return this.full;
  }
}; // Output "Will be meeting with the president of BigImportantFirmCo to talk business.\nMake sure to arrive by 11:30!"

eventSummary.summary = eventSummary;

eventSummary.summary.summary.description.full += "\n(remember to show off how cool reactivity is)";
// Output ... business.\nMake sure to arrive by 11:30!\n(remember to show off how cool reactivity is)"
```

```javascript
// Create some data, note that this data is not reactive!
const someData = {
  m: 33,
  x: null,
  y: { a: true, b: false }
};

// And make some more data that *is* reactive
const model = observe({
  title: "Crucial Information",
  color: "red",
  data: null
});

// But oh no! We added the non-reactive data into a reactive object!
// This makes it implicitly reactive, now all of someData's properties and sub-objects are all reactive
model.data = someData;

// Let's use that reactivity and listen on someData.m
computed(() => console.log(someData.m)); // Output "33"

// Look, reactive!!
model.data.m++; // Output "34"
someData.m++; // Output "35"
```

### 4. Cleaning up
```javascript
// To demonstrate how computed tasks and reactive objects are garbage collected, lets create some!

{
  const thing = observe({ hi: "Hello, world" });
  // `thing` now exists

  {
    computed(() => console.log(thing.hi)); // Output "Hello, world"
    // `thing.hi` now has a computed task depending on it

    thing.hi += "!"; // Output "Hello, world!"
  }
  // `thing` and `thing.hi`'s computed task still exist

  thing.hi += "!!"; // Output "Hello, world!!"
}
// `thing` has gone out of scope!
// Both `thing` and `thing.hi`'s computed task get garbage collected.
```

### 5. Reactivity pitfalls

arrays
```javascript
const obj = { arr: [1, 2, 3] };
observe(obj);

computed(() => console.log(obj.arr)); // Output "1,2,3"

obj.arr[2] = 4; // No output, arrays are not reactive!
obj.arr.push(5); // Still no output, as this library does not replace array methods

// If you want to use arrays, do it like this:
// 1. Run your operations
obj.arr[2] = 3;
obj.arr[3] = 4;
obj.arr.push(5);
// 2. Then set the array to itself
obj.arr = obj.arr; // Output "1,2,3,4,5"
```

added
```javascript
const obj = { y: 20 };
observe(obj);

obj.x = 10;

computed(() => console.log(obj.x)); // Output "10"
computed(() => console.log(obj.y)); // Output "20"

obj.y += 2; // Output "22"

obj.x += 2; // No output, as this property was added after observation

observe(obj);

obj.x += 2; // Still no output, as objects cannot be re-observed
```

proto
```javascript
const objPrototype = {
  x: 10
};
const obj = {
  y: 20
};
Object.setPrototypeOf(obj, objPrototype);

observe(obj);

computed(() => console.log(obj.x)); // Output "10"
computed(() => console.log(obj.y)); // Output "20"

obj.y = 21; // Output "21"

obj.x = 11; // No output, as this isn't an actual property of `obj`
objPrototype.x = 12; // No output, as prototypes are not reactive
```

non-enumerable and non-configurable
```javascript
const obj = {
  z: 30
};
Object.defineProperty(obj, "x", {
  enumerable: false,
  value: 10
});
Object.defineProperty(obj, "y", {
  configurable: false,
  value: 20
});

observe(obj);

computed(() => console.log(obj.x)); // Output "10"
computed(() => console.log(obj.y)); // Output "20"
computed(() => console.log(obj.z)); // Output "30"

obj.z++; // Output "31"

obj.x++; // No output as this property is non-enumerable
obj.y++; // No output as this property is non-configurable
```

## Authors
Made with ❤ by Lua MacDougall ([lua.wtf](https://lua.wtf/))

## License
This project is licensed under [MIT](LICENSE).
More info in the [LICENSE](LICENSE) file.

<i>"A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use."</i> - [tl;drLegal](https://tldrlegal.com/license/mit-license)
