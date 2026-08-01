import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function generateSignature(paramsToSign: Record<string, any>): { signature: string; timestamp: number } {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado adecuadamente en el servidor.');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    ...paramsToSign,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(params, apiSecret!);
  return { signature, timestamp };
}

export function getSignedImageUrl(publicId: string, expiresInSeconds: number = 300): string {
  if (!isCloudinaryConfigured() || !publicId) {
    return '';
  }

  // Genera URL autenticada/privada firmada temporalmente
  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    secure: true,
  });
}

export async function uploadImageBuffer(buffer: Buffer, publicId?: string): Promise<any> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado adecuadamente.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'face_biometrics',
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

export default cloudinary;
