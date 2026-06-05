import { UploadProvider } from '../enums/upload-provider.enum';

export type CreateSignedUploadIntentInput = {
  filename: string;
  contentType: string;
  size: number;
  folder: string;
};

export type SignedUploadIntent = {
  provider: UploadProvider;
  attachmentId: string;
  uploadUrl: string;
  objectPath: string;
};
