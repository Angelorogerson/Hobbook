/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** External donation page (e.g. Ko-fi). The footer link is hidden when unset. */
  readonly VITE_SUPPORT_URL?: string
  /** Operator details for the imprint (§ 5 DDG). Set at build time, never committed. */
  readonly VITE_OPERATOR_NAME?: string
  readonly VITE_OPERATOR_ADDRESS?: string
  readonly VITE_OPERATOR_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
