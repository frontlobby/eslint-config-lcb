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

- `local-rules/align-imports` — named import statements, except one with a comment after its `{`, which the rebuilt import would drop
- `local-rules/multiline-ternary` — ternary expressions
- `local-rules/single-line-json-object` — object literals

```js
'local-rules/align-imports': ['error', { maxLen: 140, maxLenBuffer: 10 }],
'local-rules/single-line-json-object': ['error', { maxLen: 130, maxLenBuffer: 10 }],
```

# `local-rules/interface-layout`

Lays out multi-line TypeScript interfaces (single-line ones are left alone), and inline object types
declared on class fields:

```ts
interface SidebarSubitem {
	meta : {
		title       : string;
		/** Used by e2e tests */
		dataAutoId? : string;
		icon?       : string;
	};
	/**
	 * A comment of several lines keeps its line breaks
	 * in the multi-line JSDoc form
	 */
	path : string;
}
```

- No blank lines between members.
- Field colons are aligned with at least one space before them, so the types line up.
- An inline object type used as a field's type, directly or as an array (`{ … }[]`), is split over
  multiple lines, one member per line, and laid out by the same rules. The same goes for one declared as a
  class field's type; the class field itself keeps its `name: type` spacing.
- Field comments become one JSDoc block directly above the field, so editors show them on hover. That
  covers `//`, `/* */` and JSDoc comments above the field and a comment trailing on its last line; a
  field with both gets them merged, the comments above first. Each comment line stays one JSDoc line. A
  single line is written `/** text */` when that fits within `maxLen`; longer text, or several lines, uses
  the multi-line form.
- Directive comments (`eslint-disable`, `@ts-expect-error`, `#region`, …) are left untouched, and so is
  every other comment on the same field. Comments that belong to no field, such as one before the
  closing brace, are left untouched too.

Padding before a type colon is normally reported by `@stylistic/type-annotation-spacing`, so the base
config turns that rule off and enables `local-rules/type-annotation-spacing` in its place: the same rule,
minus the space-before-colon checks on fields `interface-layout` aligns. It also leaves alone any colon or
arrow whose fix would rewrite more than spaces or tabs, such as a comment beside it.
