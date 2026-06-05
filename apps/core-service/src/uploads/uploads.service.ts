import { BadRequestException, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import { UploadProvider } from './config/enums/upload-provider.enum';
import type {
  CreateSignedUploadIntentInput,
  SignedUploadIntent,
} from './config/types/upload.types';

const MAX_UPLOAD_BYTES = 50_000_000;
const UPLOAD_SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DOWNLOAD_SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hour
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
  private storage: Storage;

  constructor() {
    this.storage = new Storage({ projectId: process.env.GCS_PROJECT_ID });
  }

  async createSignedUploadIntent(
    input: CreateSignedUploadIntentInput
  ): Promise<SignedUploadIntent> {
    this.validateUploadRequest(input.contentType, input.size);
    const bucket = this.bucketName();
    const attachmentId = crypto.randomUUID();
    const objectPath = `${input.folder}/${attachmentId}`;

    const [uploadUrl] = await this.storage
      .bucket(bucket)
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + UPLOAD_SIGNED_URL_TTL_MS,
        contentType: input.contentType,
      });

    return {
      provider: UploadProvider.GCS,
      attachmentId,
      uploadUrl,
      objectPath,
    };
  }

  async getSignedDownloadUrl(
    objectPath: string,
    opts?: { filename?: string; mimeType?: string },
  ): Promise<string> {
    const bucket = this.bucketName();
    const isImage = opts?.mimeType?.startsWith('image/');
    const disposition =
      !isImage && opts?.filename
        ? `attachment; filename="${opts.filename}"`
        : undefined;

    const [url] = await this.storage
      .bucket(bucket)
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + DOWNLOAD_SIGNED_URL_TTL_MS,
        ...(disposition ? { responseDisposition: disposition } : {}),
      });
    return url;
  }

  async resolveAttachmentUrls<
    T extends { publicId: string; url: string | null; name: string; mimeType: string | null },
  >(attachments: T[]): Promise<(T & { url: string })[]> {
    if (attachments.length === 0) {
      return attachments as (T & { url: string })[];
    }
    const signedUrls = await Promise.all(
      attachments.map((a) =>
        this.getSignedDownloadUrl(a.publicId, {
          filename: a.name,
          mimeType: a.mimeType ?? undefined,
        }),
      ),
    );
    return attachments.map((a, i) => ({ ...a, url: signedUrls[i] }));
  }

  private validateUploadRequest(contentType: string, size: number) {
    if (size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Upload is too large');
    }
    if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException('Upload content type is not supported');
    }
  }

  private bucketName(): string {
    const name = process.env.GCS_BUCKET_NAME;
    if (!name) {
      throw new BadRequestException('GCS is not configured');
    }
    return name;
  }
}
