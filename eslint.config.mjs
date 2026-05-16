import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/generated/**",
      "public/**",
    ],
  },
];

export default config;
