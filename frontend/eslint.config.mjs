import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Standard Next.js data-fetch / hydrate effects call setState; this rule is too strict for our app patterns.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
