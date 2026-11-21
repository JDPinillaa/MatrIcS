/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Falls back to http://localhost:3000. */
  readonly VITE_API_BASE_URL?: string
  /** Request timeout in milliseconds. Falls back to 8000. */
  readonly VITE_API_TIMEOUT_MS?: string
}
