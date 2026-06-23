import { haversineKm, haversineSql } from '../src/utils/geo.js';

describe('haversineKm', () => {
  test('returns 0 for identical points', () => {
    expect(haversineKm(6.69, 3.35, 6.69, 3.35)).toBeCloseTo(0, 5);
  });

  test('computes a known distance (Ibafo ↔ Mowe ≈ 16-18 km)', () => {
    const d = haversineKm(6.69, 3.35, 6.82, 3.43);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(25);
  });

  test('is symmetric', () => {
    const a = haversineKm(6.69, 3.35, 6.9, 3.49);
    const b = haversineKm(6.9, 3.49, 6.69, 3.35);
    expect(a).toBeCloseTo(b, 8);
  });

  test('returns null when a coordinate is missing/invalid', () => {
    expect(haversineKm(null, 3.35, 6.82, 3.43)).toBeNull();
    expect(haversineKm(6.69, 'x', 6.82, 3.43)).toBeNull();
  });
});

describe('haversineSql', () => {
  test('produces a SQL expression referencing the bound params', () => {
    const sql = haversineSql('$1', '$2');
    expect(sql).toContain('$1');
    expect(sql).toContain('$2');
    expect(sql).toContain('6371');
  });
});
