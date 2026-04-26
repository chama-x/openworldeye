/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_GROQ_MODEL?: string;
  readonly VITE_ANALYTICS_ENDPOINT?: string;
  readonly VITE_ANALYTICS_WEBSITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
