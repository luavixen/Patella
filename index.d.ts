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
 * @return {function} The now-registered computed task function
 */
export declare function computed<T extends () => void>(fn: T): T;

/**
 * Mark a function as "disposed" which will prevent it from being run as a
 * computed task and remove it from the dependencies of reactive objects
 * @param {function} fn Computed task function to dispose of, omit this
 *                      parameter to dispose of the current computed task
 */
export declare function dispose(fn?: (() => void) | null): void;
