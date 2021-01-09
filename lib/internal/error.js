/**
 * Writes a warning to the console
 * @param {string} message Message to write
 */
export function logWarning(message) {
  console.warn(message);
}

/**
 * Throw an error with a given message
 * @param {string} message Error message
 */
export function throwError(message) {
  throw new Error(message);
}
