import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  ...nx.configs["flat/typescript"],
  ...nx.configs["flat/javascript"],
  {
    ignores: [
      "**/dist",
      "**/node_modules",
      ".nx/**",
      "**/vite.config.*.timestamp*",
      "**/vitest.config.*.timestamp*",
      "**/example/**",
    ],
  },
  {
    files: ["**/*.json"],
    languageOptions: {
      parser: await import("jsonc-eslint-parser"),
    },
    rules: {},
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allowCircularSelfDependency: true,
          enforceBuildableLibDependency: true,
          allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
          depConstraints: [
            {
              sourceTag: "*",
              onlyDependOnLibsWithTags: ["*"],
            },
          ],
        },
      ],
      "no-debugger": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];
