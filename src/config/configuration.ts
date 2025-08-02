// src/config/configuration.ts
// Application configuration

export default () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    name: 'Inner View AI',
    version: '1.0.0',
  },
  database: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  firebase: {
    type: process.env.FIREBASE_TYPE,
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI,
    tokenUri: process.env.FIREBASE_TOKEN_URI,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.7,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      basic: process.env.STRIPE_PRICE_BASIC,
      pro: process.env.STRIPE_PRICE_PRO,
    },
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
    plans: {
      basic: process.env.PAYPAL_PLAN_BASIC,
      pro: process.env.PAYPAL_PLAN_PRO,
    },
  },
  security: {
    bcryptRounds: 10,
    jwtExpiresIn: '7d',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
    rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds (kept for other uses)
    ttl: 900, // 15 minutes in seconds (for ThrottlerModule)
    max: 100, // limit each IP to 100 requests per window
    },
});