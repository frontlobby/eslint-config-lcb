This holds the base LCB shop standard ESLint configuration file.

Custom rules are authored in TypeScript (`.mts`) under `lib/` but consumed as plain, pre-built
`.mjs` under `dist/` (committed to the repo) — Node refuses to strip TypeScript types for files
inside `node_modules`, and installing this package via its GitHub shorthand (`github:...`) fetches
a tarball that skips the `prepare` lifecycle script, so `dist/` can't be rebuilt reliably at
install time. Run `npm run build` after changing anything under `lib/` and commit the result.

Developing/testing the `.mts` source directly (not the committed `dist/` output) requires
**Node.js >= 22.18** for native TypeScript type stripping.

Use this in Node.js projects as follows:

1. Add a dependency for this package to your `package.json` file:
	```
	{
		"devDependencies" : {
			"@frontlobby/eslint-config-lcb": "^9.0.0",
		}
	}
	```

1. Add the following to your project's `eslint.config.mjs` file:
	```
	import { config } from '@frontlobby/eslint-config-lcb';

	export default [
		...config,
	];
	```

# Building

```sh
npm run build
```

Compiles `lib/**/*.mts` + `eslintLocalRules.mts` to `dist/`. Required after any change under
`lib/` — `baseRules.mjs` imports the local rules from `dist/eslintLocalRules.mjs`, not the
TypeScript source directly. `npm run lint` runs this automatically; `npm run prepare` (which
also runs it) only helps for consumers that install over a real `git clone`, not the GitHub
tarball shorthand this package is normally consumed through — commit `dist/` before tagging a
release.

# Running Tests

- a specific rule
	```sh
	npx mocha tests/lib/rules/VueFacingDecoratorPropRequirements.mts
	```

- all tests
	```sh
	npm test
	```

- type-check custom rules
	```sh
	npm run typecheck
	```

- If dependencies are not installed yet, run:
	```sh
	npm install
	```

# Local rules: `maxLen` / `maxLenBuffer`

Several local rules split long single-line constructs and collapse multiline ones when they fit. Without a buffer, values just over `maxLen` can flip between formats on repeated lint/fix passes.

`maxLenBuffer` adds hysteresis on both sides of `maxLen`, creating a dead zone where the current format is left alone:

| Check | Threshold |
|-------|-----------|
| Split / wrap (single-line) | line length `> maxLen + maxLenBuffer` |
| Collapse / unwrap (multiline) | collapsed line length `<= maxLen - maxLenBuffer` |

Lengths between those thresholds are not changed, which prevents wrap/unwrap oscillation near the limit.

Default `maxLenBuffer` is **5**. Set to `0` to split/wrap above `maxLen` and collapse/unwrap at or below `maxLen`.

Rules that support these options:

- `local-rules/align-imports` — named import statements
- `local-rules/multiline-ternary` — ternary expressions
- `local-rules/single-line-json-object` — object literals

```js
'local-rules/align-imports': ['error', { maxLen: 140, maxLenBuffer: 10 }],
'local-rules/single-line-json-object': ['error', { maxLen: 130, maxLenBuffer: 10 }],
```
