/*
 * Copyright (C) 2024-2025  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {FlatCompat} from '@eslint/eslintrc';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import esbuild from 'esbuild';
import header from 'eslint-plugin-header';
// @ts-expect-error - Missing types https://github.com/import-js/eslint-plugin-import/issues/3133
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import jsonc from 'eslint-plugin-jsonc';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import parser from 'jsonc-eslint-parser';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import typescriptEslint from 'typescript-eslint';

const compat = new FlatCompat({
    baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

// @ts-expect-error - This is a workaround https://github.com/Stuk/eslint-plugin-header/issues/57
header.rules.header.meta.schema = false;

/**
 * @param {string[]} scriptPaths
 * @returns {Promise<string[]>}
 */
async function getDependencies(scriptPaths) {
    const v = await esbuild.build({
        entryPoints: scriptPaths,
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es2022',
        format: 'esm',
        write: false,
        metafile: true,
    });
    const dependencies = Object.keys(v.metafile.inputs);
    const stringComparer = new Intl.Collator('en-US'); // Invariant locale
    dependencies.sort((a, b) => stringComparer.compare(a, b));
    return dependencies;
}

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
    {
        ignores: ['ext/lib/', 'dev/lib/handlebars/', '**/node_modules/', '**/builds/'],
    },
    ...compat.extends(
        'eslint:recommended',
        'plugin:jsonc/recommended-with-json',
        'plugin:eslint-comments/recommended',
    ),
    {
        plugins: {
            'no-unsanitized': noUnsanitized,
            header,
            jsdoc,
            jsonc,
            'unused-imports': unusedImports,
            '@typescript-eslint': typescriptEslint.plugin,
            '@stylistic': stylistic,
            unicorn,
            sonarjs,
            'import': importPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },

            parser: typescriptEslint.parser,
            ecmaVersion: 2022,
            sourceType: 'module',

            parserOptions: {
                ecmaFeatures: {
                    globalReturn: false,
                    impliedStrict: true,
                },

                project: [
                    './jsconfig.json',
                    './dev/jsconfig.json',
                    './test/jsconfig.json',
                    './benches/jsconfig.json',
                ],
            },
        },

        rules: {
            'accessor-pairs': 'error',
            'curly': ['error', 'all'],
            'default-case-last': 'error',
            'dot-notation': 'error',
            'eqeqeq': 'error',
            'func-names': ['error', 'always'],
            'guard-for-in': 'error',
            'grouped-accessor-pairs': 'error',
            'new-cap': 'error',
            'no-alert': 'error',
            'no-case-declarations': 'error',
            'no-caller': 'error',
            'no-const-assign': 'error',

            'no-constant-condition': ['error', {
                checkLoops: false,
            }],

            'no-constructor-return': 'error',
            'no-duplicate-imports': 'error',
            'no-eval': 'error',
            'no-extend-native': 'error',
            'no-global-assign': 'error',
            'no-implicit-globals': 'error',
            'no-implied-eval': 'error',
            'no-new': 'error',
            'no-new-native-nonconstructor': 'error',
            'no-octal': 'error',
            'no-octal-escape': 'error',
            'no-param-reassign': 'off',
            'no-promise-executor-return': 'error',
            'no-prototype-builtins': 'error',

            'no-restricted-syntax': ['error', {
                message: 'Avoid using JSON.parse(), prefer parseJson.',
                selector: 'MemberExpression[object.name=JSON][property.name=parse]',
            }, {
                message: 'Avoid using Response.json(), prefer readResponseJson.',
                selector: 'MemberExpression[property.name=json]',
            }, {
                message: 'Avoid using performance, prefer safePerformance.',
                selector: 'MemberExpression[object.name=performance]',
            }],

            'no-self-compare': 'error',
            'no-sequences': 'error',

            'no-shadow': ['error', {
                builtinGlobals: false,
            }],

            'no-shadow-restricted-names': 'error',
            'no-template-curly-in-string': 'error',
            'no-undef': 'error',
            'no-undefined': 'error',

            'no-underscore-dangle': ['error', {
                allowAfterThis: true,
                allowAfterSuper: false,
                allowAfterThisConstructor: false,
            }],

            'no-unexpected-multiline': 'error',
            'no-unneeded-ternary': 'error',

            'no-unused-vars': ['error', {
                vars: 'local',
                args: 'after-used',
                argsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],

            'no-unused-expressions': 'error',
            'no-var': 'error',
            'no-with': 'error',

            'prefer-const': ['error', {
                destructuring: 'all',
            }],

            'radix': 'error',
            'require-atomic-updates': 'off',
            'sort-imports': 'off',
            'yoda': ['error', 'never'],
            '@stylistic/array-bracket-newline': ['error', 'consistent'],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/array-element-newline': ['error', 'consistent'],
            '@stylistic/arrow-parens': ['error', 'always'],

            '@stylistic/arrow-spacing': ['error', {
                before: true,
                after: true,
            }],

            '@stylistic/block-spacing': ['error', 'always'],

            '@stylistic/brace-style': ['error', '1tbs', {
                allowSingleLine: true,
            }],

            '@stylistic/comma-dangle': ['error', 'always-multiline'],

            '@stylistic/comma-spacing': ['error', {
                before: false,
                after: true,
            }],

            '@stylistic/comma-style': ['error', 'last'],
            '@stylistic/computed-property-spacing': ['error', 'never'],
            '@stylistic/dot-location': ['error', 'property'],
            '@stylistic/eol-last': ['error', 'always'],
            '@stylistic/func-call-spacing': ['error', 'never'],
            '@stylistic/function-call-argument-newline': ['error', 'consistent'],
            '@stylistic/function-call-spacing': ['error', 'never'],
            '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
            '@stylistic/generator-star-spacing': ['error', 'before'],
            '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],

            '@stylistic/indent': ['error', 4, {
                SwitchCase: 1,
                MemberExpression: 1,
                flatTernaryExpressions: true,
                ignoredNodes: ['ConditionalExpression'],
            }],

            '@stylistic/indent-binary-ops': ['error', 0],

            '@stylistic/key-spacing': ['error', {
                beforeColon: false,
                afterColon: true,
                mode: 'strict',
            }],

            '@stylistic/keyword-spacing': ['error', {
                before: true,
                after: true,
            }],

            '@stylistic/linebreak-style': ['error', 'unix'],
            '@stylistic/lines-around-comment': 'off',

            '@stylistic/lines-between-class-members': ['error', 'always', {
                exceptAfterSingleLine: true,
            }],

            '@stylistic/max-len': 'off',

            '@stylistic/max-statements-per-line': ['error', {
                max: 2,
            }],

            '@stylistic/member-delimiter-style': ['error', {
                multiline: {
                    delimiter: 'semi',
                    requireLast: true,
                },

                singleline: {
                    delimiter: 'comma',
                    requireLast: false,
                },

                multilineDetection: 'brackets',
            }],

            '@stylistic/multiline-ternary': ['error', 'always-multiline'],
            '@stylistic/new-parens': 'error',

            '@stylistic/newline-per-chained-call': ['error', {
                ignoreChainWithDepth: 3,
            }],

            '@stylistic/no-confusing-arrow': 'error',
            '@stylistic/no-extra-parens': 'off',
            '@stylistic/no-extra-semi': 'error',
            '@stylistic/no-floating-decimal': 'error',

            '@stylistic/no-mixed-operators': ['error', {
                allowSamePrecedence: true,
                groups: [['&&', '||']],
            }],

            '@stylistic/no-mixed-spaces-and-tabs': 'error',
            '@stylistic/no-multi-spaces': 'error',

            '@stylistic/no-multiple-empty-lines': ['error', {
                max: 2,
                maxEOF: 0,
                maxBOF: 0,
            }],

            '@stylistic/no-tabs': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-whitespace-before-property': 'error',
            '@stylistic/nonblock-statement-body-position': ['error', 'beside'],
            '@stylistic/object-curly-newline': 'error',
            '@stylistic/object-curly-spacing': ['error', 'never'],

            '@stylistic/object-property-newline': ['error', {
                allowAllPropertiesOnSameLine: true,
            }],

            '@stylistic/one-var-declaration-per-line': ['error', 'initializations'],
            '@stylistic/operator-linebreak': ['error', 'after'],
            '@stylistic/padded-blocks': ['error', 'never'],

            '@stylistic/padding-line-between-statements': ['error', {
                blankLine: 'always',
                prev: '*',
                next: 'import',
            }, {
                blankLine: 'always',
                prev: 'import',
                next: '*',
            }, {
                blankLine: 'always',
                prev: '*',
                next: 'export',
            }, {
                blankLine: 'always',
                prev: 'import',
                next: 'let',
            }, {
                blankLine: 'always',
                prev: 'import',
                next: 'const',
            }, {
                blankLine: 'always',
                prev: 'export',
                next: 'let',
            }, {
                blankLine: 'always',
                prev: 'export',
                next: 'const',
            }, {
                blankLine: 'always',
                prev: 'export',
                next: 'export',
            }, {
                blankLine: 'always',
                prev: 'export',
                next: 'type',
            }, {
                blankLine: 'always',
                prev: 'type',
                next: 'export',
            }, {
                blankLine: 'always',
                prev: 'type',
                next: 'type',
            }, {
                blankLine: 'never',
                prev: 'import',
                next: 'import',
            }],

            '@stylistic/quote-props': ['error', 'consistent-as-needed', {
                numbers: true,
            }],

            '@stylistic/quotes': ['error', 'single', 'avoid-escape'],
            '@stylistic/rest-spread-spacing': ['error', 'never'],
            '@stylistic/semi': 'error',

            '@stylistic/semi-spacing': ['error', {
                before: false,
                after: true,
            }],

            '@stylistic/semi-style': ['error', 'last'],
            '@stylistic/space-before-blocks': ['error', 'always'],

            '@stylistic/space-before-function-paren': ['error', {
                anonymous: 'never',
                named: 'never',
                asyncArrow: 'always',
            }],

            '@stylistic/space-in-parens': ['error', 'never'],

            '@stylistic/space-infix-ops': ['error', {
                int32Hint: false,
            }],

            '@stylistic/space-unary-ops': 'error',
            '@stylistic/spaced-comment': ['error', 'always'],

            '@stylistic/switch-colon-spacing': ['error', {
                after: true,
                before: false,
            }],

            '@stylistic/template-curly-spacing': ['error', 'never'],
            '@stylistic/template-tag-spacing': ['error', 'never'],

            '@stylistic/type-annotation-spacing': ['error', {
                before: false,
                after: true,

                overrides: {
                    arrow: {
                        before: true,
                        after: true,
                    },
                },
            }],

            '@stylistic/type-generic-spacing': 'error',
            '@stylistic/type-named-tuple-spacing': 'error',
            '@stylistic/wrap-iife': ['error', 'inside'],
            '@stylistic/wrap-regex': 'off',

            '@stylistic/yield-star-spacing': ['error', {
                before: true,
                after: false,
            }],

            'no-unsanitized/method': 'error',
            'no-unsanitized/property': 'error',
            'jsdoc/check-access': 'error',
            'jsdoc/check-alignment': 'error',

            'jsdoc/check-line-alignment': ['error', 'never', {
                wrapIndent: '  ',
            }],

            'jsdoc/check-param-names': 'error',
            'jsdoc/check-property-names': 'error',
            'jsdoc/check-tag-names': 'error',
            'jsdoc/empty-tags': 'error',
            'jsdoc/check-types': 'error',
            'jsdoc/check-values': 'error',
            'jsdoc/implements-on-classes': 'error',
            'jsdoc/multiline-blocks': 'error',
            'jsdoc/no-bad-blocks': 'error',
            'jsdoc/no-multi-asterisks': 'error',
            'jsdoc/no-undefined-types': 'error',
            'jsdoc/require-asterisk-prefix': 'error',
            'jsdoc/require-description': 'off',
            'jsdoc/require-hyphen-before-param-description': ['error', 'never'],

            'jsdoc/require-jsdoc': ['error', {
                require: {
                    ClassDeclaration: false,
                    FunctionDeclaration: true,
                    MethodDefinition: false,
                },

                contexts: [
                    'MethodDefinition[kind=constructor]>FunctionExpression>BlockStatement>ExpressionStatement>AssignmentExpression[left.object.type=ThisExpression]',
                    'ClassDeclaration>Classbody>PropertyDefinition',
                    'MethodDefinition[kind!=constructor][kind!=set]',
                    'MethodDefinition[kind=constructor][value.params.length>0]',
                ],

                checkGetters: 'no-setter',
                checkSetters: 'no-getter',
            }],

            'jsdoc/require-param': 'error',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-param-name': 'error',
            'jsdoc/require-param-type': 'error',
            'jsdoc/require-property': 'error',
            'jsdoc/require-property-description': 'off',
            'jsdoc/require-property-name': 'error',
            'jsdoc/require-property-type': 'error',
            'jsdoc/require-returns': 'error',
            'jsdoc/require-returns-check': 'error',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/require-returns-type': 'error',
            'jsdoc/require-throws': 'error',
            'jsdoc/require-yields': 'error',
            'jsdoc/require-yields-check': 'error',

            'jsdoc/tag-lines': ['error', 'never', {
                startLines: 0,
            }],

            'jsdoc/valid-types': 'error',
            'jsonc/indent': ['error', 4],
            'jsonc/array-bracket-newline': ['error', 'consistent'],
            'jsonc/array-bracket-spacing': ['error', 'never'],
            'jsonc/array-element-newline': ['error', 'consistent'],
            'jsonc/comma-style': ['error', 'last'],

            'jsonc/key-spacing': ['error', {
                beforeColon: false,
                afterColon: true,
                mode: 'strict',
            }],

            'jsonc/no-octal-escape': 'error',

            'jsonc/object-curly-newline': ['error', {
                consistent: true,
            }],

            'jsonc/object-curly-spacing': ['error', 'never'],

            'jsonc/object-property-newline': ['error', {
                allowAllPropertiesOnSameLine: true,
            }],

            'eslint-comments/no-unused-disable': 'error',
            'unused-imports/no-unused-imports': 'error',
            'import/extensions': ['error', 'ignorePackages'],

            'unicorn/catch-error-name': ['error', {
                ignore: ['^(e|error2?)$'],
            }],

            'unicorn/custom-error-definition': 'error',
            'unicorn/empty-brace-spaces': 'error',
            'unicorn/error-message': 'error',
            'unicorn/expiring-todo-comments': 'error',
            'unicorn/explicit-length-check': 'error',
            'unicorn/new-for-builtins': 'error',
            'unicorn/no-abusive-eslint-disable': 'error',
            'unicorn/no-array-for-each': 'error',
            'unicorn/no-array-method-this-argument': 'error',
            'unicorn/no-array-push-push': 'error',
            'unicorn/no-array-reduce': 'error',
            'unicorn/no-console-spaces': 'error',
            'unicorn/no-document-cookie': 'error',
            'unicorn/no-empty-file': 'error',
            'unicorn/no-hex-escape': 'error',
            'unicorn/no-instanceof-array': 'error',
            'unicorn/no-invalid-remove-event-listener': 'error',
            'unicorn/no-lonely-if': 'error',
            'unicorn/no-nested-ternary': 'error',
            'unicorn/no-new-buffer': 'error',
            'unicorn/no-object-as-default-parameter': 'error',
            'unicorn/no-static-only-class': 'error',
            'unicorn/no-thenable': 'error',
            'unicorn/no-unnecessary-await': 'error',
            'unicorn/no-unnecessary-polyfills': 'error',
            'unicorn/no-unreadable-array-destructuring': 'error',
            'unicorn/no-unreadable-iife': 'error',
            'unicorn/no-useless-fallback-in-spread': 'error',
            'unicorn/no-useless-length-check': 'error',
            'unicorn/no-useless-promise-resolve-reject': 'error',
            'unicorn/no-useless-spread': 'error',
            'unicorn/no-useless-switch-case': 'error',
            'unicorn/no-useless-undefined': 'error',
            'unicorn/no-zero-fractions': 'error',
            'unicorn/prefer-array-find': 'error',
            'unicorn/prefer-array-flat': 'error',
            'unicorn/prefer-array-flat-map': 'error',
            'unicorn/prefer-array-index-of': 'error',
            'unicorn/prefer-array-some': 'error',
            'unicorn/prefer-date-now': 'error',
            'unicorn/prefer-default-parameters': 'error',
            'unicorn/prefer-dom-node-dataset': 'error',
            'unicorn/prefer-dom-node-text-content': 'error',
            'unicorn/prefer-event-target': 'error',
            'unicorn/prefer-export-from': 'error',
            'unicorn/prefer-includes': 'error',
            'unicorn/prefer-keyboard-event-key': 'error',
            'unicorn/prefer-logical-operator-over-ternary': 'error',
            'unicorn/prefer-modern-math-apis': 'error',
            'unicorn/prefer-module': 'error',
            'unicorn/prefer-native-coercion-functions': 'error',
            'unicorn/prefer-negative-index': 'error',
            'unicorn/prefer-number-properties': 'error',
            'unicorn/prefer-object-from-entries': 'error',
            'unicorn/prefer-prototype-methods': 'error',
            'unicorn/prefer-reflect-apply': 'error',
            'unicorn/prefer-regexp-test': 'error',
            'unicorn/prefer-set-has': 'error',
            'unicorn/prefer-set-size': 'error',
            'unicorn/prefer-spread': 'error',
            'unicorn/prefer-string-starts-ends-with': 'error',
            'unicorn/prefer-string-trim-start-end': 'error',
            'unicorn/prefer-switch': 'error',
            'unicorn/prefer-ternary': 'error',
            'unicorn/relative-url-style': 'error',
            'unicorn/require-array-join-separator': 'error',
            'unicorn/require-number-to-fixed-digits-argument': 'error',
            'unicorn/template-indent': 'error',
            'unicorn/throw-new-error': 'error',
            'sonarjs/max-switch-cases': 'error',
            'sonarjs/no-all-duplicated-branches': 'error',
            'sonarjs/no-collapsible-if': 'error',
            'sonarjs/no-collection-size-mischeck': 'error',
            'sonarjs/no-duplicated-branches': 'error',
            'sonarjs/no-element-overwrite': 'error',
            'sonarjs/no-empty-collection': 'error',
            'sonarjs/no-extra-arguments': 'error',
            'sonarjs/no-gratuitous-expressions': 'error',
            'sonarjs/no-identical-conditions': 'error',
            'sonarjs/no-identical-expressions': 'error',
            'sonarjs/no-identical-functions': 'error',
            'sonarjs/no-ignored-return': 'error',
            'sonarjs/no-inverted-boolean-check': 'error',
            'sonarjs/no-one-iteration-loop': 'error',
            'sonarjs/no-redundant-boolean': 'error',
            'sonarjs/no-redundant-jump': 'error',
            'sonarjs/no-same-line-conditional': 'error',
            'sonarjs/no-unused-collection': 'error',
            'sonarjs/no-use-of-empty-return-value': 'error',
            'sonarjs/no-useless-catch': 'error',
            'sonarjs/non-existent-operator': 'error',
            'sonarjs/prefer-immediate-return': 'error',
            'sonarjs/prefer-object-literal': 'error',
            'sonarjs/prefer-single-boolean-return': 'error',
            'sonarjs/prefer-while': 'error',
        },
    },
    ...typescriptEslint.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: [
            '**/*.js',
            '**/*.ts',
        ],
    })),
    {
        files: [
            '**/*.js',
            '**/*.ts',
        ],

        rules: {
            '@typescript-eslint/no-floating-promises': ['error', {
                ignoreIIFE: true,
            }],

            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/prefer-promise-reject-errors': 'off',

            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-expect-error': {
                    descriptionFormat: '^ - .+$',
                },
            }],

            '@typescript-eslint/no-empty-object-type': 'error',
            '@typescript-eslint/no-unsafe-function-type': 'error',
            '@typescript-eslint/no-wrapper-object-types': 'error',
            '@typescript-eslint/no-explicit-any': 'error',

            '@typescript-eslint/no-shadow': ['error', {
                builtinGlobals: false,
            }],

            '@typescript-eslint/no-this-alias': 'error',

            '@typescript-eslint/no-unused-vars': ['error', {
                vars: 'local',
                args: 'after-used',
                argsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
        },
    },
    {
        files: [
            '**/*.ts',
        ],

        rules: {
            '@stylistic/block-spacing': 'off',

            '@stylistic/comma-dangle': ['error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'always-multiline',
                enums: 'always-multiline',
                generics: 'always-multiline',
                tuples: 'always-multiline',
            }],

            '@stylistic/indent-binary-ops': 'off',

            '@stylistic/no-multiple-empty-lines': ['error', {
                max: 1,
                maxEOF: 0,
                maxBOF: 0,
            }],

            '@stylistic/no-extra-parens': ['error', 'all'],
        },
    },
    {
        files: [
            '**/*.json',
        ],

        languageOptions: {
            parser: parser,
        },
    },
    {
        files: [
            '.vscode/launch.json',
        ],

        rules: {
            'jsonc/no-comments': 'off',
        },
    },
    {
        files: [
            'ext/data/schemas/options-schema.json',
        ],

        rules: {
            '@stylistic/no-multi-spaces': 'off',
        },
    },
    {
        files: [
            'test/data/anki-note-builder-test-results.json',
            'test/data/database-test-cases.json',
            'test/data/translator-test-results-note-data1.json',
            'test/data/translator-test-results.json',
        ],

        rules: {
            'jsonc/indent': ['error', 2],
        },
    },
    {
        files: [
            'test/data/dictionaries/valid-dictionary1/term_bank_1.json',
            'test/data/dictionaries/valid-dictionary1/term_bank_2.json',
        ],

        rules: {
            'jsonc/array-element-newline': 'off',
            'jsonc/object-property-newline': 'off',
        },
    },
    {
        files: [
            '**/*.js',
            '**/*.ts',
        ],

        rules: {
            'header/header': ['error', 'block', {
                pattern: ' \\* Copyright \\(C\\) (20(23|24)-)?2025  Yomitan Authors(\n \\* Copyright \\(C\\) (20(16|17|18|19|20|21)-)?2022  Yomichan Authors)?\n \\*\n \\* This program is free software: you can redistribute it and/or modify\n \\* it under the terms of the GNU General Public License as published by\n \\* the Free Software Foundation, either version 3 of the License, or\n \\* \\(at your option\\) any later version\\.\n \\*\n \\* This program is distributed in the hope that it will be useful,\n \\* but WITHOUT ANY WARRANTY; without even the implied warranty of\n \\* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE\\.  See the\n \\* GNU General Public License for more details\\.\n \\*\n \\* You should have received a copy of the GNU General Public License\n \\* along with this program\\.  If not, see <https://www\\.gnu\\.org/licenses/>\\.\n ',
            }],
        },
    },
    {
        files: [
            'ext/**/*.js',
        ],

        rules: {
            'no-console': 'error',
        },
    },
    {
        files: [
            'test/**/*.js',
            'dev/**/*.js',
            '**/integration.spec.js',
            '**/playwright.config.js',
            '**/playwright-util.js',
            '**/visual.spec.js',
        ],

        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, 'off'])),
                ...globals.node,
                ...Object.fromEntries(Object.entries(globals.webextensions).map(([key]) => [key, 'off'])),
            },
        },
    },
    {
        files: [
            'test/data/html/**/*.js',
        ],

        languageOptions: {
            globals: {
                ...globals.browser,
                ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, 'off'])),
                ...Object.fromEntries(Object.entries(globals.webextensions).map(([key]) => [key, 'off'])),
            },

            ecmaVersion: 5,
            sourceType: 'script',
        },
    },
    {
        files: [
            'test/data/html/**/*.js',
        ],
        ignores: [
            'test/data/html/js/html-test-utilities.js',
        ],

        languageOptions: {
            globals: {
                HtmlTestUtilities: 'readonly',
            },
        },
    },
    {
        files: [
            'test/**/*.test.js',
        ],
        plugins: {
            vitest,
        },
        ...vitest.configs.recommended,
        rules: {
            'vitest/prefer-to-be': 'off',
        },
    },
    ...compat.extends('plugin:@typescript-eslint/disable-type-checked').map((config) => ({
        ...config,
        files: [
            'dev/lib/**/*.js',
            'eslint.config.js',
        ],
    })),
    {
        files: [
            'ext/js/templates/template-renderer-frame-main.js',
            ...await getDependencies(['ext/js/templates/template-renderer-frame-main.js']),
        ],

        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.webextensions).map(([key]) => [key, 'off'])),
            },
        },
    },
    {
        files: [
            'ext/js/dictionary/dictionary-worker-main.js',
            ...await getDependencies(['ext/js/dictionary/dictionary-worker-main.js']),
        ],

        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, 'off'])),
                ...globals.worker,
            },
        },
    },
    {
        files: [
            'ext/js/background/background-main.js',
            ...await getDependencies(['ext/js/background/background-main.js']),
        ],

        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, 'off'])),
                ...globals.serviceworker,
                FileReader: 'readonly',
                Intl: 'readonly',
                crypto: 'readonly',
                AbortController: 'readonly',
            },
        },
    },
    {
        files: [
            'ext/data/recommended-dictionaries.json',
        ],

        rules: {
            'jsonc/sort-keys': ['error', {
                pathPattern: '.*',
                hasProperties: ['name'],
                order: ['name', 'description', 'homepage', 'downloadUrl'],
            }, {
                pathPattern: '.*',

                order: {
                    type: 'asc',
                },
            }],
        },
    },
    {
        files: [
            'ext/data/recommended-settings.json',
        ],

        rules: {
            'jsonc/sort-keys': ['error', {
                pathPattern: '.*',
                order: ['modification', 'description'],
            }, {
                pathPattern: '.*',

                order: {
                    type: 'asc',
                },
            }],
        },
    },
];
