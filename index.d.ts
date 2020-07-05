/**
 * Make a JavaScript object reactive
 * @param {object} obj Object to make reactive
 * @return {object} The input object, now with reactivity
 */
export declare function observe<T extends object>(obj: T): T;

/**
 * Execute a function as a computed task and record its dependencies. The task
 * will then be re-run whenever its dependencies change.
 * @param {function} fn Function to run and register as a computed task
 */
export declare function computed(fn: () => void): void;
