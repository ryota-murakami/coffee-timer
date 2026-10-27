// `typescript` is the TypeScript 6 API (see package.json). typescript-eslint
// still imports that package; `tsc` comes from `@typescript/native` (TypeScript 7).
import nextConfig from 'eslint-config-next'
import lastStanceReactNextPlugin from '@laststance/react-next-eslint-plugin'
import { fixupConfigRules } from '@eslint/compat'
import * as espree from 'espree'

const config = [
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'next-env.d.ts',
      'public/**',
    ],
  },
  {
    plugins: {
      '@laststance/react-next': lastStanceReactNextPlugin,
    },
    rules: {
      // Keep this list aligned with the published plugin rules so CI can boot lint reliably.
      '@laststance/react-next/no-jsx-without-return': 'error',
      '@laststance/react-next/all-memo': 'error',
      '@laststance/react-next/no-use-reducer': 'error',
      '@laststance/react-next/no-set-state-prop-drilling': 'error',
      '@laststance/react-next/no-deopt-use-callback': 'error',
      '@laststance/react-next/no-deopt-use-memo': 'error',
      '@laststance/react-next/no-direct-use-effect': 'error',
      '@laststance/react-next/prefer-stable-context-value': 'error',
      '@laststance/react-next/prefer-usecallback-might-work': 'error',
      '@laststance/react-next/prefer-usecallback-for-memoized-component':
        'error',
      '@laststance/react-next/prefer-usememo-for-memoized-component': 'error',
      '@laststance/react-next/prefer-usememo-might-work': 'error',
    },
  },
  // Bridge legacy plugin context APIs until Next.js plugins support ESLint 10.
  ...fixupConfigRules(nextConfig),
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      // Use ESLint's standard parser until Next.js's Babel parser supports ESLint 10.
      parser: espree,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
]

export default config
