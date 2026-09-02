import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'docs-site/**',
            'coverage/**',
            '.astro/**',
            'node_modules/**',
            'eslint.config.mjs',
            'astro.config.mjs',
            'scripts/**',
            'src/content/**',
            'src/styles/**',
            'assets/**',
        ],
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
            'max-lines-per-function': 'off',
        },
    },
);
