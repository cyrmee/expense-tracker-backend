import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { createCipheriv, createDecipheriv, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

@Injectable()
export class CryptoService {
  private static readonly KEY_LENGTH_BYTES = 32;

  private readonly algorithm: string;
  private readonly iv: Buffer;
  private key?: Buffer;
  private keyPromise?: Promise<Buffer>;

  constructor(private readonly config: ConfigService) {
    const encryptionAlgorithm = this.config.get<string>('ENCRYPTION_ALGORITHM');
    if (!encryptionAlgorithm) {
      throw new Error(
        'Missing required environment variable: ENCRYPTION_ALGORITHM',
      );
    }
    this.algorithm = encryptionAlgorithm;

    const encryptionIv = this.config.get<string>('ENCRYPTION_IV');
    if (!encryptionIv) {
      throw new Error('Missing required environment variable: ENCRYPTION_IV');
    }
    this.iv = Buffer.from(encryptionIv.toString(), 'utf-8');

    // aes-* ciphers require a 16-byte IV. This keeps failures deterministic.
    if (this.iv.length !== 16) {
      throw new Error(
        `Invalid ENCRYPTION_IV length: expected 16 bytes, got ${this.iv.length}`,
      );
    }
  }

  private deriveKey(): Promise<Buffer> {
    const secretKey = this.config.get<string>('ENCRYPTION_SECRET_KEY');
    const salt = this.config.get<string>('ENCRYPTION_SALT');

    if (!secretKey || !salt) {
      throw new Error(
        'Missing required environment variables: ENCRYPTION_SECRET_KEY or ENCRYPTION_SALT',
      );
    }

    return promisify(scrypt)(
      secretKey,
      salt,
      CryptoService.KEY_LENGTH_BYTES,
    ) as Promise<Buffer>;
  }

  private async getKey(): Promise<Buffer> {
    if (this.key) {
      return this.key;
    }

    this.keyPromise ??= this.deriveKey();
    this.key = await this.keyPromise;
    return this.key;
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
      const key = await this.getKey();
      const cipher = createCipheriv(this.algorithm, key, this.iv);
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
      const key = await this.getKey();
      const decipher = createDecipheriv(this.algorithm, key, this.iv);
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
}
