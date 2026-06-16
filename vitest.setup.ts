process.env.APP_ENV = "local";
process.env.NODE_ENV = "test";
process.env.APP_URL = "http://localhost:3000";
process.env.DATABASE_URL =
  "postgresql://kvisaassistant:kvisaassistant@127.0.0.1:5432/kvisaassistant";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
process.env.ENCRYPTION_KEY = "test-encryption-key-at-least-32-characters-long";
process.env.EMAIL_PROVIDER = "console";
