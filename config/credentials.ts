// Credentials for Google Sheets service account.
//
// This module is intentionally very lightweight and reads from environment
// variables instead of embedding a private key in the repository.  The
// original implementation used a hard‑coded JSON object and was placed in
// `.gitignore`, but that prevented remote builds from resolving imports.
//
// To enable Sheets mode locally you can either populate the variables below or
// create a non‑ignored `config/credentials.ts` file containing the same
// shape.  In production it's typical to leave Sheets disabled and rely on
// Supabase (set `VITE_USE_SUPABASE=true`).

export const GOOGLE_CREDENTIALS = {
  type: import.meta.env.VITE_GOOGLE_TYPE || 'service_account',
  project_id: import.meta.env.VITE_GOOGLE_PROJECT_ID || '',
  private_key_id: import.meta.env.VITE_GOOGLE_PRIVATE_KEY_ID || '',
  private_key: import.meta.env.VITE_GOOGLE_PRIVATE_KEY
    ? import.meta.env.VITE_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : '',
  client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL || '',
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  auth_uri: import.meta.env.VITE_GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: import.meta.env.VITE_GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url:
    import.meta.env.VITE_GOOGLE_AUTH_PROVIDER_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: import.meta.env.VITE_GOOGLE_CLIENT_CERT_URL || '',
  universe_domain: import.meta.env.VITE_GOOGLE_UNIVERSE_DOMAIN || 'googleapis.com'
};