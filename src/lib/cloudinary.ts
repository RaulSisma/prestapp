// Credenciales oficiales de Cloudinary
export const CLOUDINARY_CONFIG = {
  cloudName: 'i9q04g9a',
  uploadPreset: 'prestapp1',
  apiKey: '489115484764916'
};

const STORAGE_CLOUD_NAME = 'prestapp_cloudinary_cloud_name';
const STORAGE_UPLOAD_PRESET = 'prestapp_cloudinary_upload_preset';
const STORAGE_API_KEY = 'prestapp_cloudinary_api_key';

export function getCloudinaryCredentials(): { cloudName: string; uploadPreset: string; apiKey: string; isConfigured: boolean } {
  const envName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || '';
  const envPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || '';
  const envApiKey = import.meta.env.VITE_CLOUDINARY_API_KEY?.trim() || '';

  const localName = localStorage.getItem(STORAGE_CLOUD_NAME)?.trim() || '';
  const localPreset = localStorage.getItem(STORAGE_UPLOAD_PRESET)?.trim() || '';
  const localApiKey = localStorage.getItem(STORAGE_API_KEY)?.trim() || '';

  // Determinar cloudName descartando valores erróneos previos
  let cloudName = CLOUDINARY_CONFIG.cloudName;
  if (localName && localName !== 'prestapp_preset' && localName !== 'prestapp1') {
    cloudName = localName;
  } else if (envName && envName !== 'prestapp_preset' && envName !== 'prestapp1') {
    cloudName = envName;
  }

  // Determinar uploadPreset descartando valores erróneos previos
  let uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
  if (localPreset && localPreset !== 'i9q04g9a' && localPreset !== 'prestapp_preset') {
    uploadPreset = localPreset;
  } else if (envPreset && envPreset !== 'i9q04g9a' && envPreset !== 'prestapp_preset') {
    uploadPreset = envPreset;
  }

  let apiKey = CLOUDINARY_CONFIG.apiKey;
  if (localApiKey && /^\d+$/.test(localApiKey)) {
    apiKey = localApiKey;
  } else if (envApiKey && /^\d+$/.test(envApiKey)) {
    apiKey = envApiKey;
  }

  return {
    cloudName,
    uploadPreset,
    apiKey,
    isConfigured: !!(cloudName && uploadPreset)
  };
}

export function setCloudinaryCredentials(cloudName: string, uploadPreset: string, apiKey?: string): void {
  if (cloudName.trim()) localStorage.setItem(STORAGE_CLOUD_NAME, cloudName.trim());
  if (uploadPreset.trim()) localStorage.setItem(STORAGE_UPLOAD_PRESET, uploadPreset.trim());
  if (apiKey?.trim() && /^\d+$/.test(apiKey.trim())) {
    localStorage.setItem(STORAGE_API_KEY, apiKey.trim());
  }
}

/**
 * Comprime una imagen antes de enviarla a Cloudinary para optimizar ancho de banda
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<Blob> {
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
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            isPng ? 'image/png' : 'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen directamente a Cloudinary (Unsigned Upload) y retorna la URL HTTPS pública.
 * En subidas no firmadas (Unsigned) con upload_preset, Cloudinary no requiere api_key.
 */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const { cloudName, uploadPreset } = getCloudinaryCredentials();

  if (!cloudName || !uploadPreset) {
    throw new Error('Faltan las credenciales de Cloudinary (Cloud Name o Upload Preset).');
  }

  // 1. Optimizar imagen antes de enviar
  const compressedBlob = await compressImage(file);

  // 2. Preparar FormData para subida no firmada (Unsigned) a Cloudinary
  const formData = new FormData();
  formData.append('file', compressedBlob, file.name || 'upload.jpg');
  formData.append('upload_preset', uploadPreset);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = responseData?.error?.message || `Error HTTP ${response.status} al subir a Cloudinary`;
    console.error('[Cloudinary Upload Error]', responseData);
    throw new Error(`Cloudinary Error: ${errorMsg}`);
  }

  if (!responseData.secure_url && !responseData.url) {
    throw new Error('Cloudinary no devolvió una URL válida para la imagen.');
  }

  const finalUrl = responseData.secure_url || responseData.url;
  console.log('[Cloudinary Upload Success] URL generada:', finalUrl);
  return finalUrl;
};

