import { generateUniqueSlug, slugify } from './slugify';

describe('slugify', () => {
  it('lowercases, strips accents and replaces separators with hyphens', () => {
    expect(slugify('  Calçados & Tênis  ')).toBe('calcados-tenis');
  });
});

describe('generateUniqueSlug', () => {
  it('adds a numeric suffix until the slug is free', async () => {
    const taken = new Set(['camiseta', 'camiseta-2']);

    await expect(generateUniqueSlug('Camiseta', async (s) => taken.has(s))).resolves.toBe(
      'camiseta-3',
    );
  });

  it('falls back to "item" when the name has no slug characters', async () => {
    await expect(generateUniqueSlug('!!!', async () => false)).resolves.toBe('item');
  });
});
