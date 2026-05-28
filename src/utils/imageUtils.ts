/**
 * Filter images to only include those matching the product's SKU/product_code.
 * URLs typically contain the product code as part of the filename (e.g., CHPEU_117567_KK001_Full.jpg).
 * If no product_code is provided or no images match, returns all images unfiltered.
 */
export const filterImagesBySku = (images: string[], productCode: string | null | undefined): string[] => {
  if (!productCode || images.length === 0) return images;
  
  // Normalize: strip all non-alphanumeric characters for flexible matching
  // DB may store "2Y263B0101BEACH6301" while URLs contain "2Y263B0101BEACH_6301"
  const codeNormalized = productCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  const matched = images.filter(url => {
    // Normalize the URL path the same way for comparison
    const urlNormalized = url.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return urlNormalized.includes(codeNormalized);
  });
  
  // If we found matches, return them; otherwise return all images (don't hide everything)
  return matched.length > 0 ? matched : images;
};

/**
 * Check if a category represents shoes/footwear
 */
const isShoeCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  const lowerCategory = category.toLowerCase();
  return lowerCategory.includes('shoe') || 
         lowerCategory.includes('scarpe') || 
         lowerCategory.includes('boot') || 
         lowerCategory.includes('stival') ||
         lowerCategory.includes('sandal') ||
         lowerCategory.includes('sneaker') ||
         lowerCategory.includes('mocassin') ||
         lowerCategory.includes('loafer') ||
         lowerCategory.includes('décolleté') ||
         lowerCategory.includes('decollete') ||
         lowerCategory.includes('pump') ||
         lowerCategory.includes('heel') ||
         lowerCategory.includes('ciabatt') ||
         lowerCategory.includes('slide');
};

/**
 * Check if a URL is a plain flat-lay product image (not close-up, not worn/model, not detail)
 * 
 * Champion URL patterns:
 * - _Full.jpg → main flat-lay product shot ✓ BEST
 * - _Full_Front.jpg → front flat-lay ✓ OK  
 * - _Full_Back.jpg → back flat-lay ✓ OK
 * - _Full_Crop.jpg → close-up/detail ✗ AVOID
 * - _Full_Alt1.jpg → alternate angle (often worn/model) ✗ AVOID
 * 
 * Max Mara URL patterns:
 * - -w- → flat lay ✓
 * - -a- → shoe flat lay ✓
 */
const getMaxMaraVariantCode = (url: string): string | null => {
  const match = url.toLowerCase().match(/-([a-z])-.*_normal\./);
  return match?.[1] ?? null;
};

const isMaxMaraMasterPackshot = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('/s3master/') && lower.includes('_normal.') && !lower.includes('/s3swatch/');
};

const isMaxMaraAllowedPackshotVariant = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();
  if (!lower.includes('maxmara.com')) return false;
  const variant = getMaxMaraVariantCode(lower);
  if (!variant) return false;
  if (variant === 'a') return true;
  return variant === 'w' && isShoeCategory(category);
};

const isMaxMaraWornOrDetailVariant = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();
  if (!lower.includes('maxmara.com')) return false;
  return !isMaxMaraAllowedPackshotVariant(lower, category);
};

const toMaxMaraMasterPackshot = (url: string, category?: string | null): string => {
  const preferredVariant = isShoeCategory(category) ? 'w' : 'a';
  return url
    .replace('/s3details/', '/s3master/')
    .replace('/s3swatch/', '/s3master/')
    .replace(/-([a-z])-([^/_?#]+_normal\.)/i, `-${preferredVariant}-$2`);
};

const isFlatLayUrl = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();
  const isMasterPackshot = isMaxMaraMasterPackshot(lower);
  
  // Champion patterns: _Full.jpg is the clean flat-lay (no suffix after _Full)
  // Match _Full.jpg but NOT _Full_Crop, _Full_Alt, etc.
  if (lower.includes('_full.jpg') || lower.includes('_full.png')) {
    // Make sure it's truly just "_Full.ext" and not "_Full_Something.ext"
    const fullMatch = lower.match(/_full\.(jpg|png|webp)/);
    if (fullMatch) return true;
  }
  
  // Also match _Full_Front as a secondary flat-lay
  if (lower.includes('_full_front.')) return true;

  // Max Mara master packshots are the clean product-only source.
  if (isMasterPackshot && isMaxMaraAllowedPackshotVariant(lower, category)) return true;
  
  // Max Mara flat lay patterns
  if (lower.includes('_normal.jpg') && isMaxMaraAllowedPackshotVariant(lower, category)) return true;
  
  return false;
};

const isStrictCollageSafeUrl = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();

  if (isMaxMaraMasterPackshot(lower)) {
    return isMaxMaraAllowedPackshotVariant(lower, category);
  }

  return /_full\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower) ||
    /_full_front\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower);
};

/**
 * Check if a URL looks like a close-up, crop, or detail shot
 */
const isCloseUpOrDetail = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_crop') || 
         lower.includes('_detail') || 
         lower.includes('_closeup') ||
         lower.includes('_close_up') ||
         lower.includes('_zoom') ||
         isMaxMaraWornOrDetailVariant(lower, category);
};

/**
 * Check if a URL looks like a worn/model shot or alternate angle
 */
const isBackView = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_back') || lower.includes('_rear');
};

const isWornOrAlternate = (url: string, category?: string | null): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_alt') || 
         lower.includes('_model') || 
         lower.includes('_worn') || 
          lower.includes('_lifestyle') ||
           isMaxMaraWornOrDetailVariant(lower, category);
};

/**
 * Get the flat lay / product-only image from an array of images.
 * Prioritizes plain flat-lay shots over close-ups and worn/model images.
 * 
 * Priority order:
 * 1. SKU-matched plain flat-lay (_Full.jpg or -w-/_a- patterns)
 * 2. SKU-matched _Full_Front.jpg
 * 3. SKU-matched _Full_Back.jpg
 * 4. Any flat-lay image
 * 5. Any image that's NOT a close-up and NOT worn/alternate
 * 6. First non-thumbnail image
 * 7. First image
 */
export const getFlatLayImage = (images: string[] | null | undefined, category?: string | null): string | null => {
  if (!images || images.length === 0) return null;

  const normalizedImages = images.filter(Boolean);

  // Priority 0: explicit master packshot folders beat everything else.
  // This fixes Max Mara sets where the s3master image is the clean flat-lay,
  // while s3details contains on-body/detail variants that create bad cutouts.
  const masterPrimary = normalizedImages.find(img => isMaxMaraMasterPackshot(img) && isMaxMaraAllowedPackshotVariant(img, category));
  if (masterPrimary) return masterPrimary;

  const masterAny = normalizedImages.find(img => {
    const lower = img.toLowerCase();
    return isMaxMaraMasterPackshot(lower) && isMaxMaraAllowedPackshotVariant(lower, category);
  });
  if (masterAny) return masterAny;

  // Priority 1: Plain _Full.ext with NO suffix after "Full" (no _Alt1, _Front, _Back, _Crop, etc.)
  const plainFull = normalizedImages.find(img => {
    const lower = img.toLowerCase();
    return /_full\.(jpg|png|webp|jpeg)(\?.*)?$/.test(lower);
  });
  if (plainFull) return plainFull;

  // Priority 3: Any clean flat-lay image
  const flatLay = normalizedImages.find(img => isFlatLayUrl(img, category) && !isCloseUpOrDetail(img, category) && !isWornOrAlternate(img, category));
  if (flatLay) return flatLay;

  // Priority 4: Any image that's NOT a close-up AND NOT a worn/alternate shot
  const cleanImage = normalizedImages.find(img => 
    !isCloseUpOrDetail(img, category) && !isWornOrAlternate(img, category) && !isBackView(img) && !img.includes('#thumbnail')
  );
  if (cleanImage) return cleanImage;

  // Priority 5: First image that's not a thumbnail
  const firstNonThumb = normalizedImages.find(img => !img.includes('#thumbnail'));
  if (firstNonThumb) return firstNonThumb;

  // Fallback: return first image
  return normalizedImages[0];
};

/**
 * Get the worn / model image from an array of images
 */
export const getWornImage = (images: string[] | null | undefined): string | null => {
  if (!images || images.length === 0) return null;

  // Priority 1: Find a normal image that's NOT a flat lay
  const wornNormal = images.find(img => 
    img.includes('_normal.jpg') && 
    !img.includes('-w-') && 
    !img.includes('#thumbnail')
  );
  if (wornNormal) return wornNormal;

  // Priority 2: First non-flat-lay image
  const firstNonFlatLay = images.find(img => 
    !img.includes('-w-') && !img.includes('#thumbnail')
  );
  if (firstNonFlatLay) return firstNonFlatLay;

  // Fallback: return first image
  return images[0];
};

/**
 * Parse images from various formats (string, array, JSON string)
 */
export const parseImages = (images: unknown): string[] => {
  if (!images) return [];

  const splitAndClean = (value: string): string[] =>
    value
      .split(/\r?\n/)
      .map((img) => img.trim())
      .filter((img) => img.length > 0);

  if (Array.isArray(images)) {
    return images.flatMap((img) =>
      typeof img === 'string' ? splitAndClean(img) : []
    );
  }

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((img) =>
          typeof img === 'string' ? splitAndClean(img) : []
        );
      }
    } catch {
      return splitAndClean(images);
    }
  }

  return [];
};

/**
 * Get the best main product image by first filtering to the correct SKU/color variant,
 * then selecting the flat-lay shot. This prevents showing images from other color variants.
 */
export const getMainProductImage = (
  images: unknown,
  productCode?: string | null,
  category?: string | null
): string | null => {
  const parsed = parseImages(images);
  if (parsed.length === 0) return null;
  
  const skuFiltered = filterImagesBySku(parsed, productCode);
  return getFlatLayImage(skuFiltered, category) || skuFiltered[0] || parsed[0];
};

/**
 * Strict lay-flat selector for the collage pipeline. Returns null when no
 * acceptable flat-lay source exists so the caller can skip the product instead
 * of cutting out a worn/editorial shot.
 *
 * For Max Mara URLs that only exist as /s3details/, we also derive the
 * equivalent /s3master/ packshot URL as a defensive fallback — the master
 * folder typically contains the clean product-only shot.
 */
export const getCollageSourceImage = (
  images: unknown,
  productCode?: string | null,
  category?: string | null
): string | null => {
  const parsed = parseImages(images);
  if (parsed.length === 0) return null;
  const skuFiltered = filterImagesBySku(parsed, productCode);

  const candidates = skuFiltered.flatMap((img) => {
    const lower = img.toLowerCase();
    if (lower.includes('maxmara.com')) {
      const masterAttempt = toMaxMaraMasterPackshot(img, category);
      return masterAttempt === img ? [img] : [masterAttempt, img];
    }
    return [img];
  });

  const uniqueCandidates = Array.from(new Set(candidates));
  return uniqueCandidates.find((img) => isStrictCollageSafeUrl(img, category)) ?? null;
};
