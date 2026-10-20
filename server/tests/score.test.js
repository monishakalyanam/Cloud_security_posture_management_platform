import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../src/rules-engine/score.js';

test('score = passed / total * 100, one decimal place', () => {
  assert.equal(calculateScore(11, 25), 44);
  assert.equal(calculateScore(1, 3), 33.3);
  assert.equal(calculateScore(2, 3), 66.7);
  assert.equal(calculateScore(3, 3), 100);
  assert.equal(calculateScore(0, 5), 0);
});

test('score is null (N/A) when there are no applicable checks', () => {
  assert.equal(calculateScore(0, 0), null);
});
