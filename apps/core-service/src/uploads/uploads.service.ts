import { BadRequestException, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { UploadProvider } from './config/enums/upload-provider.enum';
import type {
  CreateSignedUploadIntentInput,
  SignedUploadIntent,
} from './config/types/upload.types';

const MAX_UPLOAD_BYTES = 50_000_000;
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'video/mp4',
  'video/webm',
]);

@Injectable()
export class UploadsService {
  createSignedUploadIntent(input: CreateSignedUploadIntentInput): SignedUploadIntent {
    this.validateUploadRequest(input.contentType, input.size);
    const { cloudName, apiKey, apiSecret } = this.cloudinaryConfig();
    const attachmentId = crypto.randomUUID();
    const publicId = `${input.folder}/${attachmentId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        folder: input.folder,
        public_id: publicId,
        timestamp,
      },
      apiSecret,
    );

    return {
      provider: UploadProvider.CLOUDINARY,
      attachmentId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      apiKey,
      timestamp,
      signature,
      publicId,
      folder: input.folder,
    };
  }

  private validateUploadRequest(contentType: string, size: number) {
    if (size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Upload is too large');
    }
    if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException('Upload content type is not supported');
    }
  }

  private cloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary is not configured');
    }

    return { cloudName, apiKey, apiSecret };
  }
}
