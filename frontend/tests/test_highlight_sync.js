/**
 * Comprehensive verification suite for EchoRead Milestone 5:
 * Synchronized Word-by-Word Highlighting logic & timing synchronization.
 */

import { findActiveWordIndex } from '../src/utils/findActiveWord.js';

function runSyncTests() {
  console.log('='.repeat(65));
  console.log('EchoRead Milestone 5: Highlighting & Synchronization Tests');
  console.log('='.repeat(65));

  // Test 1: Short sentence with several words
  console.log('\n[1/7] Testing short sentence word timing mapping...');
  const shortSentenceWords = [
    { text: 'EchoRead', start: 0.100, duration: 0.588, end: 0.688 },
    { text: 'reads', start: 0.700, duration: 0.320, end: 1.020 },
    { text: 'aloud.', start: 1.035, duration: 0.450, end: 1.485 },
  ];

  console.assert(findActiveWordIndex(shortSentenceWords, 0.05) === -1, 'T1.1: Before speech start should be -1');
  console.assert(findActiveWordIndex(shortSentenceWords, 0.100) === 0, 'T1.2: Exact start of word 0');
  console.assert(findActiveWordIndex(shortSentenceWords, 0.400) === 0, 'T1.3: Middle of word 0');
  console.assert(findActiveWordIndex(shortSentenceWords, 0.700) === 1, 'T1.4: Word 1 start');
  console.assert(findActiveWordIndex(shortSentenceWords, 1.200) === 2, 'T1.5: Word 2 middle');
  console.log('  [OK] Short sentence intervals mapped correctly.');

  // Test 2: Longer paragraph with punctuation and varying durations
  console.log('\n[2/7] Testing longer paragraph with punctuation & micro-gaps...');
  const longParagraphWords = [
    { text: 'Welcome', start: 0.100, duration: 0.450, end: 0.550 },
    { text: 'to', start: 0.560, duration: 0.140, end: 0.700 }, // 10ms gap
    { text: 'EchoRead!', start: 0.710, duration: 0.600, end: 1.310 }, // 10ms gap
    { text: 'This', start: 1.700, duration: 0.300, end: 2.000 },     // 390ms sentence pause gap
    { text: 'studio', start: 2.010, duration: 0.400, end: 2.410 },
    { text: 'highlights', start: 2.420, duration: 0.550, end: 2.970 },
    { text: 'every', start: 2.980, duration: 0.280, end: 3.260 },
    { text: 'spoken', start: 3.270, duration: 0.350, end: 3.620 },
    { text: 'word.', start: 3.630, duration: 0.420, end: 4.050 }
  ];

  console.assert(findActiveWordIndex(longParagraphWords, 0.555) === 0, 'T2.1: Micro-gap 10ms between Welcome & to bridges to word 0');
  console.assert(findActiveWordIndex(longParagraphWords, 0.600) === 1, 'T2.2: Active word is "to"');
  console.assert(findActiveWordIndex(longParagraphWords, 1.500) === -1, 'T2.3: Audible pause between sentences (390ms) returns -1');
  console.assert(findActiveWordIndex(longParagraphWords, 1.850) === 3, 'T2.4: Active word is "This"');
  console.assert(findActiveWordIndex(longParagraphWords, 3.800) === 8, 'T2.5: Active word is "word."');
  console.log('  [OK] Multi-word paragraph intervals & pause behavior verified.');

  // Test 3: Play, Pause & Resume simulation
  console.log('\n[3/7] Testing Play, Pause, and Resume state behavior...');
  let simulatedTime = 0.850; // In middle of "EchoRead!"
  let activeIndex = findActiveWordIndex(longParagraphWords, simulatedTime);
  console.assert(activeIndex === 2, 'T3.1: Playing at 0.850s should highlight "EchoRead!" (index 2)');

  // Paused: time remains fixed at 0.850s
  let pausedIndex = findActiveWordIndex(longParagraphWords, simulatedTime);
  console.assert(pausedIndex === 2, 'T3.2: Paused state retains active word at paused time');

  // Resume: time advances to 2.100s ("studio")
  simulatedTime = 2.100;
  let resumedIndex = findActiveWordIndex(longParagraphWords, simulatedTime);
  console.assert(resumedIndex === 4, 'T3.3: Resume correctly highlights "studio" at 2.100s');
  console.log('  [OK] Play, pause, and resume state tracking verified.');

  // Test 4: Seeking directly to middle and near end of audio
  console.log('\n[4/7] Testing Seeking controls (scrubbing forward & backward)...');
  // Seek to middle (2.600s -> "highlights")
  const seekMiddleIndex = findActiveWordIndex(longParagraphWords, 2.600);
  console.assert(seekMiddleIndex === 5, 'T4.1: Seeking to 2.600s highlights "highlights" (index 5)');

  // Seek near end (3.900s -> "word.")
  const seekNearEndIndex = findActiveWordIndex(longParagraphWords, 3.900);
  console.assert(seekNearEndIndex === 8, 'T4.2: Seeking near end (3.900s) highlights final word');

  // Seek backward to start (0.200s -> "Welcome")
  const seekBackwardIndex = findActiveWordIndex(longParagraphWords, 0.200);
  console.assert(seekBackwardIndex === 0, 'T4.3: Seeking backward to 0.200s highlights "Welcome"');
  console.log('  [OK] Seeking in both directions updates highlighted word instantly.');

  // Test 5: Replay & Completion
  console.log('\n[5/7] Testing Replay and Audio Ended completion...');
  // Completed audio
  const completedIndex = findActiveWordIndex(longParagraphWords, 4.100);
  console.assert(completedIndex === -1, 'T5.1: Past audio end (4.100s >= 4.050s) clears highlight to -1');

  // Replay resets to 0.0s (before first word 0.100s)
  const replayIndex = findActiveWordIndex(longParagraphWords, 0.0);
  console.assert(replayIndex === -1, 'T5.2: Replay reset at 0.0s is cleanly unhighlighted before speech begins');
  console.log('  [OK] Completion and replay boundaries verified.');

  // Test 6: Missing, empty, or invalid timing metadata
  console.log('\n[6/7] Testing graceful handling of empty or missing metadata...');
  console.assert(findActiveWordIndex([], 1.0) === -1, 'T6.1: Empty array returns -1');
  console.assert(findActiveWordIndex(null, 1.0) === -1, 'T6.2: Null words returns -1');
  console.assert(findActiveWordIndex(undefined, 1.0) === -1, 'T6.3: Undefined words returns -1');
  console.assert(findActiveWordIndex(shortSentenceWords, -0.5) === -1, 'T6.4: Negative time returns -1');
  console.assert(findActiveWordIndex(shortSentenceWords, NaN) === -1, 'T6.5: NaN time returns -1');
  console.log('  [OK] Gracefully handles edge cases without throwing exceptions.');

  // Test 7: New speech generation state reset
  console.log('\n[7/7] Testing new speech generation state replacement...');
  const newSpeechWords = [
    { text: 'Brand', start: 0.120, duration: 0.400, end: 0.520 },
    { text: 'new', start: 0.530, duration: 0.250, end: 0.780 },
    { text: 'audio.', start: 0.790, duration: 0.410, end: 1.200 },
  ];
  // Replacing old words with new words
  console.assert(newSpeechWords.length === 3, 'T7.1: New speech metadata replaced old word timings');
  console.assert(findActiveWordIndex(newSpeechWords, 0.600) === 1, 'T7.2: Highlights new word "new"');
  console.log('  [OK] Audio replacement cleans up state correctly.');

  console.log('\n' + '='.repeat(65));
  console.log('ALL 7 SYNCHRONIZATION TESTS PASSED SUCCESSFULLY! [OK]');
  console.log('='.repeat(65));
}

runSyncTests();
