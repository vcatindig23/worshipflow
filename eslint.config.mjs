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
    // These design-skill assets are plain WebGL helpers, not React modules.
    // Their useFallback() utility is unrelated to React's Hook API.
    files: [
      ".agents/skills/design-taste-frontend/assets/effects/fx.js",
      ".agents/skills/design-taste-frontend/assets/objects/photo-kit/photo.js",
    ],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
