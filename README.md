<h1 align="center">
  &#x1F501; Luar
</h1>
<p align="center"><i>
  Luar is a library for facilitating extremely simple <a href="https://wikipedia.org/wiki/Reactive_programming">Reactive Programming</a> in JavaScript, inspired by Vue.js and Hyperactiv.
</i></p>

## Description
Luar is one of the simplest and smallest implementations of the reactive programming paradigm for the JavaScript (ECMAScript 5) programming language *(with TypeScript support)*.
Written in a single script file containing 300~ lines of fully commented ES5, it is easy to understand and modify, and when minified and gzipped it is around 800 bytes.
Also, it works on any browser from the last 10 years (IE 9 and up)!

Luar provides functions for "observing" JavaScript objects and for creating "computed" functions which operate on the data inside of those objects.
When the data in an observed object updates, any computed functions that depend on that data are re-run.

For example, let's use Luar to make a webpage reactive:
```javascript
const { observe, computed } = require("luar");

// Find the title and content elements on the page
const titleElem = document.getElementById("title");
const contentElem = document.getElementById("content");

// Create our model data which we will connect to those elements
const model = observe({
  title: "Hello, world",
  content: "Powered by Luar"
});

// Connect the model to the elements
computed(() => { titleElem.innerText = model.title; });     // #1
computed(() => { contentElem.innerText = model.content; }); // #2

// Now let's update some data!
model.title = "Luar - Reactive Programming"; // Will re-run #1 as #1 depends on model.title
// The #title element will update instantly, Luar is synchronous

// And add some more content
model.content += ", the elements on this site are tied to a reactive object"; // Will re-run #2
```

## Installation
Through NPM:
```
npm install luar
```
Or through Unpkg for the browser:
```html
<script src="https://unpkg.com/luar"></script>
```

## Usage

### Basics
Let's start with `observe(obj)`, it takes an object as an argument and makes the object's properties "reactive" when used with computed functions.
```javascript
const model = observe({
  a: 10,
  b: 20,
  person: {
    first: "John",
    last: "Smith"
  }
});
```
The `model` variable contains a JavaScript object that functions exactly like a normal object but, when its data is changed, will update any dependant computed functions.

Speaking of which, let's add a computed function!
```javascript
const model = observe({
  a: 10,
  b: 20,
  person: {
    first: "John",
    last: "Smith"
  }
});

computed(() => {
  const sum = model.a + model.b;
  console.log("The sum of a and b is", sum);
});
```
Since computed functions are always evaluated immediately (and synchronously), this code outputs "The sum of a and b is 30" as soon as the call to `computed(fn)` runs.

Now, let's actually do some reactive stuff!
```javascript
const model = observe({
  a: 10,
  b: 20,
  person: {
    first: "John",
    last: "Smith"
  }
});

computed(() => {
  const sum = model.a + model.b;
  console.log("The sum of a and b is", sum);
}); // Prints "The sum of a and b is 30"

model.a = 11; // Prints "The sum of a and b is 31"

model.b = model.a; // Prints "The sum of a and b is 22"

model.a = model.a; // Prints "The sum of a and b is 22" again, even though the
                   // values are the same
```
Cool, that's reactivity in a nutshell.
Since the computed function depends on `model.a` and `model.b`, whenever those values are changed the computed function will be re-run.

### Advanced usage
Here is a much more detailed example, it contains various computed functions that depend on eachother and trigger eachother.
It should also give you some ideas on how a MVC (Model View Controller) system can be made using the power of Luar!
```javascript
const model = observe({
  length: 0, fullLength: 0,
  person: {
    first: "John",
    last: "Smith",
    full: ""
  }
});

// Connect everything together
computed(() =>
  model.person.full = model.person.first + " " + model.person.last;
); // Depends on model.person.first and model.person.last
computed(() =>
  model.length = model.person.first.length
); // Depends on model.person.first
computed(() =>
  model.fullLength = model.person.full.length
); // Depends on model.person.last

// And display the person's full name on the page!
computed(() => {
  document.getElementById("name").innerText = model.person.full;
});

// Change "John Smith" to "Matt Smith", this update is synchronous and will
// recalculate the full name, both lengths, and will then update the page all in
// one go!
model.person.first = "Matt";

// You can even completely replace the object, Luar will automatically observe
// any objects set onto reactive properties
model.person = { first: "Lua", last: "MacDougall", full: "" };
// Now it shows my name! Even replacing the object is handled gracefully
```

### Error handling
Any errors generated by computed functions will be forwarded to the statement that generated them.
```javascript
// This statement throws "Oops!"
computed(() => {
  throw new Error("Oops!");
});

const nums = observe({ x: 10, y: 20 });

// Cause a kerfuffle if x > 30
computed(() => {
  if (nums.x > 30) {
    throw new Error("OnO!");
  }
});

// Totally fine
nums.x = 20;

// This statement throws "OnO!"
nums.x += 15;
// Note that the value is changed even if the computed function(s) throw, so x
// has been updated to 35 anyway
```

### Common pitfalls
Note that it is possible to create two or more computed functions that can infinitely trigger eachother, which will cause an error.
```javascript
const nums = observe({ x: 10, y: 20 });

computed(() => {
  nums.a; // This makes nums.a a dependency
  nums.b++; // Update nums.b
});

// Throws "Maximum computed task length exceeded (stack overflow!)"
// (plus much more information)
computed(() => {
  nums.b; // This makes nums.b a dependency
  nums.a++; // Update nums.a
});
```
Also remember that arrays are not reactive:
```javascript
const obj = observe({ arr: [1, 2, 3, 4] });

computed(() => {
  console.log(obj.arr);
  times++;
});

// Not reactive!
obj.arr[0] = 0;

// Not reactive! (Luar does not modify array methods to make them reactive)
obj.arr.push(5);

// There we go! This works because this changes the actual value we depend
// on instead of the contents of the value
obj.arr = obj.arr;
```

### More edge cases and features
I recommend you read through the [index.test.js](index.test.js) file, which contains tests for every little feature/edge case/reactivity pitfall. It should really help you understand how this library works, especially the last section.

## Authors
Made with ❤ by Lua MacDougall ([lua.wtf](https://lua.wtf/))

## License
This project is licensed under [MIT](LICENSE).
More info in the [LICENSE](LICENSE) file.

<i>"A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use."</i> - [tl;drLegal](https://tldrlegal.com/license/mit-license)
