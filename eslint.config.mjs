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
  // Vendored @justin06lee/chrome components ("own the code", but not ours to
  // restyle). They intentionally read a scroll ref during render for the
  // line-sync overlay and use underscore-prefixed throwaway vars — relax the
  // rules they trip rather than rewriting library code.
  //
  // set-state-in-effect: the registry sets state in effects deliberately and
  // correctly — mount gates that must not run on the server (not-found's random
  // ascii cat, count-up's in-view tween, ascii's fetched art) and reset-on-close
  // for overlays (command-palette, use-menu). Rewriting these locally would fork
  // the library for a lint rule it does not target; drift belongs upstream.
  {
    files: ["components/chrome/**", "hooks/**"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
