import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const disabledReactRules = Object.fromEntries(
  Object.keys(reactPlugin.rules).map((ruleName) => [
    `react/${ruleName}`,
    "off",
  ]),
);

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      // Hardhat tooling (CommonJS, not part of the Next.js app)
      "hardhat.config.cjs",
      "scripts/**",
      "test/**",
      "artifacts/**",
      "cache/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react 7.37.x is not fully compatible with ESLint 10's
      // context API. Keep lint usable until the plugin catches up.
      ...disabledReactRules,
    },
  },
];

export default eslintConfig;
