/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Default `/api/v1` */
  readonly VITE_API_PREFIX?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Idle logout duration, e.g. `300s`, `5m`, `1h` */
  readonly VITE_SESSION_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
