/**
 * Makes an object's properties reactive
 * @param {Object} object Object to observe
 * @returns {Object} Input `object`, now reactive
 */
export declare function observe<T extends object>(object: T): T;

/**
 * Prevents an object from being made reactive
 * @param {Object} object Object to ignore
 * @returns {Object} Input `object`, now ignored
 */
export declare function ignore<T extends object>(object: T): T;

/**
 * Calls a function and records any reactive properties it accesses, calling it again whenever any of the accessed properties update
 * @param {Function} func Function to execute
 * @returns {Function} Input `func`
 */
export declare function computed<T extends () => void>(func: T): T;

/**
 * "Disposes" a function that was run with `computed`, deregistering it so that it will no longer be called whenever any of its accessed reactive properties update
 * @param {Function} [func] Function to dispose, omit to dispose the currently executing computed function
 * @param {boolean} [clean] If truthy, only deregister the function from all dependencies, but allow it to be used with `computed` again in the future
 * @returns {Function} Input `func` if `func` is valid, otherwise `undefined`
 */
export declare function dispose(func?: null, clean?: boolean | null): void;
export declare function dispose<T extends () => void>(func: T, clean?: boolean | null): T;
