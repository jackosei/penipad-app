import { describe, expect, it } from 'vitest';
import { safeFilename } from './export';

describe('safeFilename', () => {
  it('strips the .pdf extension and unsafe characters', () => {
    expect(safeFilename('Counting 1-10.pdf')).toBe('Counting-1-10');
    expect(safeFilename('a/b\\c:*?.pdf')).toBe('abc');
  });

  it('collapses whitespace to single dashes', () => {
    expect(safeFilename('  big   spaces  ')).toBe('big-spaces');
  });

  it('falls back to a default when nothing usable remains', () => {
    expect(safeFilename('***')).toBe('worksheet');
    expect(safeFilename('')).toBe('worksheet');
  });
});
