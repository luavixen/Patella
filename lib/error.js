/**
 * Writes a warning to the console
 * @param message Message to write
 */
export function logWarning(message) {
  console.warn(message);
}

/**
 * Throws an error with a given message
 * @param message Error message
 */
export function throwError(message) {
  throw new Error(message);
}
