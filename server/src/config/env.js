import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a valid URL'),
  PUBLIC_SHORT_URL_BASE: z.string().url('PUBLIC_SHORT_URL_BASE must be a valid URL'),
  TRUST_PROXY: z
    .union([z.string(), z.number(), z.boolean()])
    .default('0')
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val;
      if (val === 'true') return true;
      if (val === 'false') return false;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`[CONFIG ERROR] Invalid environment configuration:\n${issues}`);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: 5000,
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/url_shortener_test',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      PUBLIC_SHORT_URL_BASE: 'http://localhost:5000',
      TRUST_PROXY: 0,
    };
