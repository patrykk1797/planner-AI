/**
 * Utilities for client-side image compression and thumbnail generation
 * to prevent localStorage QuotaExceededError and optimize Gemini Vision payload sizes.
 */

/**
 * Compresses an image data URL or File into a lightweight JPEG thumbnail (~10-25 KB).
 * Perfect for storing in local state or offline caches without exhausting browser storage.
 */
export async function createCompressedThumbnail(
  source: string | File,
  maxDimension = 360,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(typeof source === 'string' ? source.slice(0, 5000) : '');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve('');
        }
      };

      img.onerror = () => {
        resolve('');
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(source);
      }
    } catch {
      resolve('');
    }
  });
}

/**
 * Downscales very large mobile photos (e.g. 12MP/4000px) down to max 1600px
 * before transmitting to Gemini Vision API, ensuring fast network upload and
 * avoiding payload size limit errors.
 */
export async function optimizeImageForVision(
  source: string | File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ base64Image: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            if (typeof source === 'string') {
              resolve({ base64Image: source, mimeType: 'image/jpeg' });
            } else {
              reject(new Error('Canvas context not available'));
            }
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const outputDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64Image: outputDataUrl,
            mimeType: 'image/jpeg',
          });
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(source);
      }
    } catch (e) {
      reject(e);
    }
  });
}
