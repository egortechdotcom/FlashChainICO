module.exports = {
    parser: "@typescript-eslint/parser",
    env: {
        node: true,
        mocha: true,
    },
    plugins: ["@typescript-eslint", "prettier", "promise", "import"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "plugin:promise/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    ],
    rules: {
        camelcase: ["error", { allow: [] }],
        "import/order": [
            "error",
            {
                groups: [
                    "object",
                    ["builtin", "external"],
                    "parent",
                    "sibling",
                    "index",
                    "type",
                ],
                "newlines-between": "always",
            },
        ],
        "object-shorthand": "error",
        "prefer-const": "error",
        "sort-imports": [
            "error",
            { ignoreDeclarationSort: true, allowSeparatedGroups: true },
        ],
        "max-len": [
            "error",
            {
                ignoreUrls: true,
                ignoreStrings: true,
                ignoreTemplateLiterals: true,
            },
        ],
        "@typescript-eslint/no-non-null-assertion": "off",
    },
};
