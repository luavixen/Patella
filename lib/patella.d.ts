/**
 * Makes an object and its properties reactive recursively.
 * Subobjects (but not subfunctions!) will also be observed.
 * Note that `observe` does not create a new object, it mutates the object passed into it: `observe(object) === object`.
 * @param {Object} object Object or function to make reactive
 * @returns {Object} Input `object`, now reactive
 */
export declare function observe<T extends object>(object: T): T;

/**
 * Prevents an object from being made reactive, `observe` will do nothing.
 * Note that `ignore` is not recursive, so subobjects can still be made reactive by calling `observe` on them directly.
 * @param {Object} object Object or function to ignore
 * @returns {Object} Input `object`, now permanently ignored
 */
export declare function ignore<T extends object>(object: T): T;

/**
 * Calls `func` with no arguments and records a list of all the reactive properties it accesses.
 * `func` will then be called again whenever any of the accessed properties are mutated.
 * Note that if `func` has been `dispose`d with `!!clean === false`, no operation will be performed.
 * @param {Function} func Function to execute
 * @returns {Function} Input `func`
 */
export declare function computed<T extends () => void>(func: T): T;

/**
 * "Disposes" a function that was run with `computed`, deregistering it so that it will no longer be called whenever any of its accessed reactive properties update.
 * The <code>clean</code> parameter controls whether calling `computed` with `func` will work or no-op.
 * @param {Function} [func] Function to dispose, omit to dispose the currently executing computed function
 * @param {boolean} [clean] If truthy, only deregister the function from all dependencies, but allow it to be used with `computed` again in the future
 * @returns {Function} Input `func` if `func` is valid, otherwise `undefined`
 */
export declare function dispose(func?: null, clean?: boolean | null): void;
export declare function dispose<T extends () => void>(func: T, clean?: boolean | null): T;
