import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadProvider } from './config/enums/upload-provider.enum';
import { UploadsService } from './uploads.service';

jest.mock('cloudinary', () => ({
  v2: {
    utils: {
      api_sign_request: jest.fn(),
    },
  },
}));

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    (cloudinary.utils.api_sign_request as jest.Mock).mockReturnValue('signature');
    service = new UploadsService();
    jest.clearAllMocks();
  });

  it('creates a signed Cloudinary direct upload intent', () => {
    const result = service.createSignedUploadIntent({
      filename: 'photo.png',
      contentType: 'image/png',
      size: 123,
      folder: 'serenity/org_1/conversations/conversation_1',
    });

    expect(result).toEqual({
      provider: UploadProvider.CLOUDINARY,
      attachmentId: expect.any(String),
      uploadUrl: 'https://api.cloudinary.com/v1_1/cloud/auto/upload',
      apiKey: 'key',
      timestamp: expect.any(Number),
      signature: 'signature',
      publicId: `serenity/org_1/conversations/conversation_1/${result.attachmentId}`,
      folder: 'serenity/org_1/conversations/conversation_1',
    });
    expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
      {
        folder: 'serenity/org_1/conversations/conversation_1',
        public_id: result.publicId,
        timestamp: result.timestamp,
      },
      'secret',
    );
  });

  it('rejects unsupported type, oversize file, and missing Cloudinary config', () => {
    expect(() => service.createSignedUploadIntent({
      filename: 'script.js',
      contentType: 'application/javascript',
      size: 123,
      folder: 'serenity/org_1',
    })).toThrow(BadRequestException);

    expect(() => service.createSignedUploadIntent({
      filename: 'huge.mp4',
      contentType: 'video/mp4',
      size: 50_000_001,
      folder: 'serenity/org_1',
    })).toThrow(BadRequestException);

    delete process.env.CLOUDINARY_API_SECRET;
    expect(() => service.createSignedUploadIntent({
      filename: 'photo.png',
      contentType: 'image/png',
      size: 123,
      folder: 'serenity/org_1',
    })).toThrow(BadRequestException);
  });
});
