import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class CryptoService {
  private readonly algorithm: string;
  private readonly iv: Buffer;
  private key: Buffer;

  constructor(private readonly config: ConfigService) {
    this.algorithm = 'aes-256-ctr';

    const encryptionIv = this.config.get('ENCRYPTION_IV');
    if (!encryptionIv) {
      throw new Error('Missing required environment variable: ENCRYPTION_IV');
    }
    this.iv = Buffer.from(encryptionIv.toString(), 'utf-8');

    // Initialize key asynchronously
    this.initializeKey().catch((error) => {
      console.error('Failed to initialize encryption key:', error);
      throw error;
    });
  }

  async generateRandomToken(size: number = 32): Promise<string> {
    try {
      const buffer = await promisify(crypto.randomBytes)(size);
      return buffer.toString('hex');
    } catch (error) {
      console.error('Error generating random token:', error);
      throw error;
    }
  }

  async generateRandomPassword(): Promise<string> {
    try {
      const buffer = await promisify(crypto.randomBytes)(16);
      const hexString = buffer.toString('hex');
      return hexString.slice(0, 16);
    } catch (error) {
      console.error('Error generating random password:', error);
      throw error;
    }
  }

  async encrypt(text: string): Promise<string> {
    try {
      await this.initializeKey();
      const cipher = createCipheriv(this.algorithm, this.key, this.iv);
      const encryptedText = Buffer.concat([
        cipher.update(text),
        cipher.final(),
      ]);
      return encryptedText.toString('hex');
    } catch (error) {
      console.error('Encryption error: ', error);
      throw error;
    }
  }

  async decrypt(encryptedText: string): Promise<string> {
    try {
      await this.initializeKey();
      const decipher = createDecipheriv(this.algorithm, this.key, this.iv);
      const decryptedText = Buffer.concat([
        decipher.update(Buffer.from(encryptedText, 'hex')),
        decipher.final(),
      ]);
      return decryptedText.toString();
    } catch (error) {
      console.error('Decryption error: ', error);
      throw error;
    }
  }

  private async initializeKey(): Promise<void> {
    const secretKey = this.config.get('ENCRYPTION_SECRET_KEY');
    const salt = this.config.get('ENCRYPTION_SALT');

    if (!secretKey || !salt) {
      throw new Error(
        'Missing required environment variables: ENCRYPTION_SECRET_KEY or ENCRYPTION_SALT',
      );
    }

    const keyLength = 32;
    this.key = (await promisify(scrypt)(secretKey, salt, keyLength)) as Buffer;
  }
}
