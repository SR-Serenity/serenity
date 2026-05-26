import { BadRequestException, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';

@Injectable()
export class MailTokenService {
  encrypt(value: string) {
    const key = this.key();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string) {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      throw new BadRequestException('Stored mail token is invalid');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key(),
      Buffer.from(ivRaw, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key() {
    const configured = process.env.MAIL_TOKEN_ENCRYPTION_KEY;
    if (!configured) {
      throw new BadRequestException('MAIL_TOKEN_ENCRYPTION_KEY is not configured');
    }

    const key = Buffer.from(configured, 'base64');
    if (key.length !== 32) {
      throw new BadRequestException('MAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value');
    }
    return key;
  }
}
