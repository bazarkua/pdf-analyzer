// JEST testing file for ruleset.js

const Ruleset = require('./ruleset');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});