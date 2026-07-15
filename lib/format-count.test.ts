import { describe, it, expect } from 'vitest';
import { formatCompactCount } from './format-count';

describe('formatCompactCount', () => {
  it('returns small counts as-is', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(999)).toBe('999');
  });

  it('formats thousands with one decimal', () => {
    expect(formatCompactCount(12534)).toBe('12.5k');
    expect(formatCompactCount(1000)).toBe('1k');
    expect(formatCompactCount(1250)).toBe('1.2k');
  });

  it('drops the decimal on round thousands', () => {
    expect(formatCompactCount(12000)).toBe('12k');
  });

  it('never rounds up past the real count', () => {
    expect(formatCompactCount(12999)).toBe('12.9k');
  });

  it('handles invalid input defensively', () => {
    expect(formatCompactCount(Number.NaN)).toBe('0');
    expect(formatCompactCount(-5)).toBe('0');
  });
});
