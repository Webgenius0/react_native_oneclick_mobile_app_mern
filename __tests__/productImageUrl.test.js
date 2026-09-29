/**
 * Tests for SHEIN CDN .avif -> .jpg image URL normalization.
 *
 * SHEIN's CDN (img.ltwebstatic.com) began serving product images with .avif
 * extensions. The Android image stack (Glide via FastImage, Fresco via RN
 * Image) cannot decode AVIF on API < 31, while the same path with a .jpg
 * extension returns a decodable image from the same CDN.
 */

import { normalizeProductImageUrl } from '../src/helpers/webview1';

describe('normalizeProductImageUrl (SHEIN CDN .avif -> .jpg)', () => {
  test('rewrites .avif to .jpg for SHEIN CDN product image URLs', () => {
    const url =
      'https://img.ltwebstatic.com/images3_pi/2025/06/20/87/1750411234abcd1234efgh5678ijkl.avif';
    expect(normalizeProductImageUrl(url)).toBe(
      'https://img.ltwebstatic.com/images3_pi/2025/06/20/87/1750411234abcd1234efgh5678ijkl.jpg',
    );
  });

  test('rewrites uppercase .AVIF extension (case-insensitive)', () => {
    const url =
      'HTTPS://IMG.LTWEBSTATIC.COM/images3_ccc/2024/09/14/c4/1726308103afb22656373fc035549a3b184a4363c0.AVIF';
    expect(normalizeProductImageUrl(url)).toBe(
      'HTTPS://IMG.LTWEBSTATIC.COM/images3_ccc/2024/09/14/c4/1726308103afb22656373fc035549a3b184a4363c0.jpg',
    );
  });

  test('preserves query string when rewriting', () => {
    const url =
      'https://img.ltwebstatic.com/images3_shff/2025/01/01/aa/test-image.avif?w=800&h=1000';
    expect(normalizeProductImageUrl(url)).toBe(
      'https://img.ltwebstatic.com/images3_shff/2025/01/01/aa/test-image.jpg?w=800&h=1000',
    );
  });

  test('leaves non-avif SHEIN CDN URLs untouched', () => {
    const webp =
      'https://img.ltwebstatic.com/images3_pi/2025/06/20/87/1750411234abcd.webp';
    expect(normalizeProductImageUrl(webp)).toBe(webp);

    const jpg =
      'https://img.ltwebstatic.com/images3_pi/2025/06/20/87/1750411234abcd.jpg';
    expect(normalizeProductImageUrl(jpg)).toBe(jpg);
  });

  test('leaves .avif URLs from other domains untouched (no cross-site impact)', () => {
    const amazonAvif =
      'https://m.media-amazon.com/images/I/example.avif';
    expect(normalizeProductImageUrl(amazonAvif)).toBe(amazonAvif);

    const trendyolJpg =
      'https://cdn.dsmcdn.com/mnresize/1200/1800/ty1512/product/media/images/prod/QC/20240725/20/img.jpg';
    expect(normalizeProductImageUrl(trendyolJpg)).toBe(trendyolJpg);
  });

  test('leaves non-avif content containing "avif" elsewhere in the path untouched', () => {
    const url =
      'https://img.ltwebstatic.com/images3_avifholder/2025/01/01/aa/test-image.jpg';
    expect(normalizeProductImageUrl(url)).toBe(url);
  });

  test('handles null, empty, and non-string input safely', () => {
    expect(normalizeProductImageUrl('')).toBe('');
    expect(normalizeProductImageUrl(null)).toBe(null);
    expect(normalizeProductImageUrl(undefined)).toBe(undefined);
  });
});
