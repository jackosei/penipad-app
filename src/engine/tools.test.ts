import { describe, expect, it } from 'vitest';
import { TOOL_CONFIGS, TOOL_IDS, isToolId } from './tools';

describe('isToolId', () => {
  it('accepts every real tool id', () => {
    for (const id of TOOL_IDS) {
      expect(isToolId(id)).toBe(true);
    }
  });

  it('rejects unknown strings and non-strings (untrusted persisted data)', () => {
    expect(isToolId('highlighter')).toBe(false);
    expect(isToolId('')).toBe(false);
    expect(isToolId(null)).toBe(false);
    expect(isToolId(undefined)).toBe(false);
    expect(isToolId(42)).toBe(false);
  });
});

describe('TOOL_CONFIGS', () => {
  it('defines a config for every tool id', () => {
    for (const id of TOOL_IDS) {
      expect(TOOL_CONFIGS[id].id).toBe(id);
    }
  });

  it('renders the crayon in two source-over passes (dual-pass waxy edge)', () => {
    const crayon = TOOL_CONFIGS.crayon;
    expect(crayon.passes).toHaveLength(2);
    expect(crayon.passes.every((p) => p.composite === 'source-over')).toBe(true);
    expect(crayon.usesColor).toBe(true);
  });

  it('renders the marker in a single alpha pass', () => {
    const marker = TOOL_CONFIGS.marker;
    expect(marker.passes).toHaveLength(1);
    expect(marker.passes[0]?.composite).toBe('source-over');
    expect(marker.passes[0]?.alpha).toBeLessThan(1);
  });

  it('renders the pencil as a fine, near-opaque single pass', () => {
    const pencil = TOOL_CONFIGS.pencil;
    expect(pencil.passes).toHaveLength(1);
    expect(pencil.passes[0]?.composite).toBe('source-over');
    expect(pencil.usesColor).toBe(true);
    // Finer than a crayon at the same brush size.
    expect(pencil.sizeScale).toBeLessThan(TOOL_CONFIGS.crayon.sizeScale);
  });

  it('erases with destination-out and ignores color', () => {
    const eraser = TOOL_CONFIGS.eraser;
    expect(eraser.passes).toHaveLength(1);
    expect(eraser.passes[0]?.composite).toBe('destination-out');
    expect(eraser.usesColor).toBe(false);
  });
});
