This holds the base LCB shop standard ESLint configuration file.

Use this in Node.js projects as follows:

1. Add a dependency for this package to your `package.json` file:
	```
	{
		"devDependencies" : {
			"@frontlobby/eslint-config-lcb": "^6.0.2",
		}
	}
	```

1. Add the following to your project's `eslint.config.mjs` file:
	```
	import lcbConfig from '@frontlobby/eslint-config-lcb';

	export default [
		...lcbConfig,
	];
	```

# Running Tests

- a specific rule
	```sh
	npx mocha tests/lib/rules/vue-facing-decorator-prop-requirements.mjs
	```

- all tests
	```sh
	npx mocha "tests/**/*.mjs"
	```

- If dependencies are not installed yet, run:
	```sh
	npm install
	```
