import { generateTxnRef } from '../../src/lib/orchestrator/generateTxnRef';

describe('generateTxnRef', () => {
  it('produces an alphanumeric-only reference capped at 35 characters', async () => {
    const ref = await generateTxnRef('run-123', 1, 1, () => 'aabbcc');
    expect(ref.length).toBeLessThanOrEqual(35);
    expect(/^[A-Z0-9]+$/.test(ref)).toBe(true);
  });

  it('produces a different reference for each retry attempt even with the same random source', async () => {
    const ref1 = await generateTxnRef('run-123', 1, 1, () => 'aaaaaa');
    const ref2 = await generateTxnRef('run-123', 1, 2, () => 'aaaaaa');
    expect(ref1).not.toBe(ref2);
  });

  it('produces different references across many calls with a real-ish random source', async () => {
    let counter = 0;
    const randomHex = () => (counter++).toString(16).padStart(12, '0');
    const refs = await Promise.all(
      Array.from({ length: 50 }, (_, i) => generateTxnRef('run-abc', i, 1, randomHex))
    );
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('strips non-alphanumeric characters from the run id', async () => {
    const ref = await generateTxnRef('run-with-dashes-123', 1, 1, () => 'ff');
    expect(ref).not.toContain('-');
  });
});
