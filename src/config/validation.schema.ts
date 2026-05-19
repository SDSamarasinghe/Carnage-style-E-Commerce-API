import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),
  GLOBAL_API_PREFIX: Joi.string().default('api'),
  CLIENT_URL: Joi.string().uri().default('http://localhost:3000'),

  // Database
  MONGODB_URI: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Throttling
  THROTTLE_TTL: Joi.number().positive().default(60),
  THROTTLE_LIMIT: Joi.number().positive().default(60),
  AUTH_THROTTLE_TTL: Joi.number().positive().default(60),
  AUTH_THROTTLE_LIMIT: Joi.number().positive().default(5),

  // Cloudinary (optional in dev)
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  // SMTP (optional in dev)
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().default('Carnage <no-reply@carnage.lk>'),

  // Stripe (optional in dev)
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Super admin seed
  SUPER_ADMIN_EMAIL: Joi.string().email().default('admin@carnage.lk'),
  SUPER_ADMIN_PASSWORD: Joi.string().min(8).required(),
  SUPER_ADMIN_FIRST_NAME: Joi.string().default('Super'),
  SUPER_ADMIN_LAST_NAME: Joi.string().default('Admin'),
});
