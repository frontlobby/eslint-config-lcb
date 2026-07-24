This holds the base LCB shop standard ESLint configuration file.

Requires **Node.js >= 22.18** (native TypeScript type stripping for custom rules).

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
