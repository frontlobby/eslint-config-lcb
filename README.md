This holds the base LCB shop standard ESLint configuration file.

Use this into all NodeJS projects as follows:

1. Add a dependency for this package to your `package.json` file:
	```
	{
		"devDependencies" : {
			"@lcbapp/eslint-config-lcb": "^1.0.0",
		}
	}
	```

1. Add the following to your project's `.eslintrc` file:
	```
	{
		"extends" : "./node_modules/eslint-config-lcb/index.js",
	}
	```
