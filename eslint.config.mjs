import tseslint from 'typescript-eslint';

export default tseslint.config(
    {ignores: ['dist/**', 'docs-site/**', '.astro/**', 'node_modules/**', 'eslint.config.mjs', 'astro.config.mjs', 'ec.config.mjs', 'src/content/**', 'src/integrations/**', 'assets/**']},
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
        },
    },
);
