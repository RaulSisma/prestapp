const STORAGE_CLOUD_NAME = 'prestapp_cloudinary_cloud_name';
const STORAGE_UPLOAD_PRESET = 'prestapp_cloudinary_upload_preset';

export function getCloudinaryCredentials(): { cloudName: string; uploadPreset: string; isConfigured: boolean } {
  const envName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || '';
  const envPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || '';

  const localName = localStorage.getItem(STORAGE_CLOUD_NAME)?.trim() || '';
  const localPreset = localStorage.getItem(STORAGE_UPLOAD_PRESET)?.trim() || '';

  const cloudName = localName || envName;
  const uploadPreset = localPreset || envPreset;

  const isConfigured = !!(cloudName && uploadPreset && cloudName !== 'prestapp_preset');

  return {
    cloudName,
    uploadPreset,
    isConfigured
  };
}

export function setCloudinaryCredentials(cloudName: string, uploadPreset: string): void {
  if (cloudName.trim()) localStorage.setItem(STORAGE_CLOUD_NAME, cloudName.trim());
  if (uploadPreset.trim()) localStorage.setItem(STORAGE_UPLOAD_PRESET, uploadPreset.trim());
}

/**
 * Comprime y escala una imagen en el cliente para que pese ~20-40 KB en vez de 5-15 MB
 */
export async function compressImage(file: File, maxWidth = 640, maxHeight = 640, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Usamos JPEG comprimido al 70% de calidad para tamaño óptimo (~25KB)
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string || '');
        }
      };
      img.onerror = () => {
        resolve(event.target?.result as string || '');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen a Cloudinary de forma segura.
 * Si Cloudinary no está configurado o falla, devuelve la imagen comprimida y optimizada localmente.
 */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  // 1. Primero comprimimos la imagen para garantizar peso ligero siempre (<40KB)
  const compressedDataUrl = await compressImage(file);

  const { cloudName, uploadPreset, isConfigured } = getCloudinaryCredentials();

  // 2. Si hay credenciales reales de Cloudinary configuradas, intentar subida remota
  if (isConfigured) {
    try {
      const formData = new FormData();
      formData.append('file', compressedDataUrl || file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return data.secure_url;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[Cloudinary] Subida remota no disponible con el preset actual:', errorData?.error?.message || 'Error de autenticación');
      }
    } catch {
      console.warn('[Cloudinary] No se pudo conectar con el servidor de Cloudinary. Usando almacenamiento optimizado.');
    }
  }

  // 3. Fallback inmediato a imagen comprimida y ultra-ligera
  return compressedDataUrl;
};
