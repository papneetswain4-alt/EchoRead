/**
 * Utility for synchronizing text word highlighting with audio currentTime.
 */

/**
 * Finds the index of the currently spoken word from an ordered array of word timings.
 * Uses binary search for O(log n) efficiency.
 *
 * Policy:
 * - Returns -1 if currentTime is before the first word's start time.
 * - Returns -1 if currentTime is at or after the last word's end time.
 * - Matches exact intervals: start <= currentTime < end.
 * - Bridges micro-gaps (<= 120ms between words) to avoid visual flicker during punctuation pauses.
 *
 * @param {Array<{ text: string, start: number, duration: number, end: number }>} words
 * @param {number} currentTime - Current playback time of the audio element in seconds
 * @returns {number} Index of the active word, or -1 if no word is active
 */
export function findActiveWordIndex(words, currentTime) {
  if (!words || words.length === 0 || currentTime === undefined || currentTime === null || currentTime < 0) {
    return -1;
  }

  // Before first word
  if (currentTime < words[0].start) {
    return -1;
  }

  // Past the end of speech
  const lastWord = words[words.length - 1];
  if (currentTime >= lastWord.end) {
    return -1;
  }

  // Binary search for candidate interval
  let low = 0;
  let high = words.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const word = words[mid];

    if (currentTime >= word.start && currentTime < word.end) {
      return mid;
    }

    if (currentTime < word.start) {
      high = mid - 1;
    } else {
      // currentTime >= word.end
      // Check if we are in a tiny micro-gap before the next word
      const nextWord = words[mid + 1];
      if (nextWord && currentTime < nextWord.start) {
        const gap = nextWord.start - word.end;
        // If the gap is short (<= 120ms), keep previous word active to prevent flicker
        if (gap <= 0.12) {
          return mid;
        }
        return -1; // Audible silence gap
      }
      low = mid + 1;
    }
  }

  return -1;
}
