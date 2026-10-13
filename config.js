// Demo Pacer configuration.
// Both values below are safe to put in front-end code. Never put a "secret" or "service_role" key here.
// Find them in Supabase: Project Settings > API Keys (Project URL, and the Publishable key, or the legacy anon key).
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_KEY: "YOUR_PUBLISHABLE_KEY",

  // How people sign in:
  //   "password"  = email + password, accounts created by you in Supabase (no email service needed). Recommended.
  //   "magiclink" = emailed sign-in link (needs custom SMTP set up in Supabase, see README).
  AUTH_MODE: "password",

  // Optional (magic links only). If set, the sign-in screen only accepts addresses on this domain, e.g. "yourcompany.com".
  // This is a convenience only. The real enforcement is the optional trigger in schema.sql.
  ALLOWED_EMAIL_DOMAIN: ""
};
