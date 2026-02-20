/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TREASURY_EVM_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
