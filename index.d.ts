/**
 * Make a JavaScript object reactive
 * @param {Object} obj Object to observe
 * @returns {Object} Original input `obj`, now with reactivity
 * @public
 */
export declare function observe<T extends object>(obj: T): T;

/**
 * Execute a function as a computed task and record its dependencies. The task
 * will then be re-run whenever its dependencies change
 * @param {Function} fn Function to run and register as a computed task
 * @return {Function} Original input `fn`, now registered as a computed task
 * @public
 */
export declare function computed<T extends () => void>(fn: T): T;

/**
 * Mark a function as "disposed" which will prevent it from being run as a
 * computed task and remove it from the dependencies of reactive objects
 * @param {Function} [fn] Computed task function to dispose of, omit this
 *                        parameter to dispose of the current computed task
 * @public
 */
export declare function dispose(fn?: (() => void) | null): void;
