export type AppEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  env: AppEnv;
  port: number;
  globalPrefix: string;
  clientUrl: string;
}

export interface DatabaseConfig {
  uri: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
  authTtl: number;
  authLimit: number;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface SuperAdminSeedConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  throttle: ThrottleConfig;
  cloudinary: CloudinaryConfig;
  mail: MailConfig;
  stripe: StripeConfig;
  superAdmin: SuperAdminSeedConfig;
}

export default (): RootConfig => ({
  app: {
    env: (process.env.NODE_ENV as AppEnv) ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    globalPrefix: process.env.GLOBAL_API_PREFIX ?? 'api',
    clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  },
  database: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/carnage',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
    authTtl: parseInt(process.env.AUTH_THROTTLE_TTL ?? '60', 10),
    authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '5', 10),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Carnage <no-reply@carnage.lk>',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@carnage.lk',
    password: process.env.SUPER_ADMIN_PASSWORD ?? '',
    firstName: process.env.SUPER_ADMIN_FIRST_NAME ?? 'Super',
    lastName: process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin',
  },
});
