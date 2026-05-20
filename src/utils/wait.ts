/**
 * Wait for a given number of milliseconds.
 * @param delay Duration in milliseconds
 * @returns A promise that resolves after the delay
*/
export function wait(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
}
