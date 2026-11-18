import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
  {
    // react-three-fiber drives the scene by mutating three.js objects and shader
    // uniforms inside useFrame. That is the library's intended model, so the
    // React Compiler immutability rule does not apply to scene code.
    files: ['src/components/scene/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
