import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /**
       * This site is `output: 'export'`, which disables the Next image
       * optimizer entirely — next/image would only ship unoptimised originals.
       * Responsive AVIF/WebP derivatives are generated at build time instead
       * (scripts/build-images.mjs) and rendered by src/components/ui/Figure.tsx,
       * so a raw <img> inside a <picture> is the correct element here.
       */
      "@next/next/no-img-element": "off",

      /** Allow the `{ a: _a, ...rest }` omit idiom. */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
