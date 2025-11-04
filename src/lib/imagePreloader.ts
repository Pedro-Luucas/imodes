/**
 * Preload images by creating Image objects and waiting for them to load
 * Returns a promise that resolves when all images are loaded
 */
export function preloadImages(imageUrls: string[]): Promise<void> {
  if (imageUrls.length === 0) {
    return Promise.resolve();
  }

  const promises = imageUrls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve even on error to not block other images
      img.src = url;
    });
  });

  return Promise.all(promises).then(() => {});
}

/**
 * Preload images with priority - resolves when priority images are loaded
 * and continues loading others in the background
 */
export function preloadImagesWithPriority(
  priorityUrls: string[],
  backgroundUrls: string[] = []
): Promise<void> {
  // First load priority images
  const priorityPromise = preloadImages(priorityUrls);
  
  // Then load background images (don't wait for these)
  if (backgroundUrls.length > 0) {
    priorityPromise.then(() => {
      preloadImages(backgroundUrls).catch(() => {
        // Ignore errors for background images
      });
    });
  }

  return priorityPromise;
}

