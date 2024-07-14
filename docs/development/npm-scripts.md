# npm Scripts

This file documents the scripts available in the [package.json](../../package.json) file.
Scripts can be executed by running `npm run <name>`.

- `bench`
  Runs performance benchmarks.

- `build`
  Builds packages for all of the primary build targets and outputs them to the builds folder in the root project directory.

- `build:libs`
  Rebuilds all of the third-party dependencies that the extension uses.

- `test`
  Runs all of the tests.

- `test:fast`
  Runs most of the tests that are used more frequently in the typical development process.

- `test:static-analysis`
  Runs all of the static analysis tests (excluding JSON).

- `test:js`
  Runs [eslint](https://eslint.org/) on all of the JavaScript and TypeScript files in the project.

- `test:json`
  Runs all JSON tests.

- `test:json:format`
  Runs eslint on all of the JSON files in the project.

- `test:json:types`
  Performs type checking on all of the JSON files in the project.
  Running this script often takes a long time since it has to validate a lot of files with complex types.

- `test:css`
  Runs [stylelint](https://stylelint.io/) on all of the CSS files in the project.

- `test:html`
  Runs [html-validate](https://html-validate.org/) on all of the HTML files in the project.

- `test:md`
  Runs [prettier](https://prettier.io/) on all of the Markdown files in the project.

- `test:md:write`
  Uses prettier to fix all issues it encounters with files.

- `test:ts`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on all of the JavaScript and TypeScript files in the project.

- `test:ts:main`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [ext](../../ext/) folder.

- `test:ts:dev`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [dev](../../dev/) folder.

- `test:ts:test`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [test](../../test/) folder.

- `test:ts:bench`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [benches](../../benches/) folder.

- `test:unit`
  Runs all of the unit tests in the project using [vitest](https://vitest.dev/).

- `test:unit:write`
  Overwrites the expected test output data for some of the larger tests.
  This usually only needs to be run when something modifies the format of dictionary entries or Anki data.

- `test:unit:options`
  Runs unit tests related to the extension's options and their upgrade process.

- `test:build`
  Performs a dry run of the build process without generating any files.

- `license-report:html`
  Generates a file containing license information about the third-party dependencies the extension uses.
  The resulting file is located at ext/legal-npm.html.

- `license-report:markdown`
  Generates a Markdown table containing license information about the third-party dependencies the extension uses.
  This table is located in the [README.md](../../README.md#third-party-libraries) file

- `prepare`
  Sets up [husky](https://typicode.github.io/husky/) for some git pre-commit tasks.
