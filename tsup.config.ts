import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'next/index': 'src/next/index.ts',
    'next/app/index': 'src/next/app/index.tsx',
    'next/pages/index': 'src/next/pages/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['payload', 'next'],
})
