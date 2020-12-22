/**
 * Makes a JavaScript object reactive
 * @param {Object} obj Object to observe
 * @returns {Object} Original input `obj`, now with reactivity
 */
export declare function observe<T extends object>(obj: T): T;

/**
 * Executes a function as a computed task and record its dependencies. The task
 * will then be re-run whenever its dependencies change
 * @param {Function} task Function to run and register as a computed task
 * @return {Function} Original input `task`, now registered as a computed task
 */
export declare function computed<T extends () => void>(task: T): T;

/**
 * Marks a function as "disposed" which will prevent it from being run as a
 * computed task and remove it from the dependencies of reactive objects
 * @param {Function} [task] Computed task function to dispose of, omit this
 *                          parameter to dispose of the current computed task
 */
export declare function dispose(task?: (() => void) | null): void;
