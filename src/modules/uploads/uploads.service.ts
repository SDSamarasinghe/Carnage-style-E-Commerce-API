import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryConfig } from '@/config/configuration';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cfg = this.config.get<CloudinaryConfig>('cloudinary');
    if (cfg?.cloudName && cfg.apiKey && cfg.apiSecret) {
      cloudinary.config({
        cloud_name: cfg.cloudName,
        api_key: cfg.apiKey,
        api_secret: cfg.apiSecret,
      });
      this.configured = true;
    } else {
      this.logger.warn('Cloudinary not configured — uploads will use placeholder URLs.');
    }
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.configured) {
      return {
        url: `https://placehold.co/800x1000?text=${encodeURIComponent(filename)}`,
        publicId: filename,
      };
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'carnage', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      ).end(buffer);
    });
  }

  getSignedUploadUrl(): { signature: string; timestamp: number; cloudName: string; apiKey: string } {
    const cfg = this.config.get<CloudinaryConfig>('cloudinary');
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'carnage' },
      cfg?.apiSecret ?? '',
    );
    return {
      signature,
      timestamp,
      cloudName: cfg?.cloudName ?? '',
      apiKey: cfg?.apiKey ?? '',
    };
  }
}
