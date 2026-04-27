/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_GROQ_MODEL?: string;
  readonly VITE_ANALYTICS_ENDPOINT?: string;
  readonly VITE_ANALYTICS_WEBSITE_ID?: string;
  readonly VITE_AISSTREAM_API_KEY?: string;
  readonly VITE_ACLED_API_KEY?: string;
  readonly VITE_ACLED_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
