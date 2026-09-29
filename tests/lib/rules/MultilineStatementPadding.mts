import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { MultilineStatementPadding } from '../../../lib/rules/MultilineStatementPadding.mts';
import { namedCase }                 from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const message         = 'A multi-line statement should be separated from adjacent statements by exactly one blank line';
const unwantedMessage = 'A statement that opens a block on a short line should not have a blank line above it';

ruleTester.run('multiline-statement-padding', MultilineStatementPadding.toEslintRule(), {
	valid : [
		namedCase('accepts consecutive single-line statements', `
			const a = 1;
			const b = 2;
			foo(a, b);
		`),

		namedCase('accepts two-line statements without padding', `
			const a = 1;
			foo(a,
				2);
			const b = 2;
		`),

		namedCase('accepts multi-line statements padded by one blank line', `
			async function load(table) {
				await table.hardReset({
					filter : { status : 'current' },
					limit  : 15,
				});

				const currentLoad = table.loadMore();

				await table.hardReset({
					filter : { status : 'former' },
					limit  : 15,
				});

				const formerLoad = table.loadMore();
			}
		`),

		namedCase('does not require padding against the enclosing braces', `
			function run() {
				foo({
					a : 1,
				});
			}
		`),

		namedCase('keeps trailing comments with the previous statement', `
			foo({
				a : 1,
			}); // Trailing comment

			bar();
		`),

		namedCase('allows a leading comment directly above the next statement', `
			const a = 1;

			// Explains the call
			foo({
				a,
			});
		`),

		namedCase('allows one blank line on each side of a comment between statements', `
			foo({
				a : 1,
			});

			// #region Section

			bar();
		`),

		namedCase('ignores multi-line imports next to other imports', `
			import a from 'a';
			import {
				b,
				c,
			} from 'b';
			import d from 'd';
		`),

		namedCase('needs no blank line after a short closing line', `
			foo({
				a : 1,
			});
			bar();
		`),

		namedCase('needs no blank line between a short closing line and a short opening one', `
			foo({
				a : 1,
			});
			{
				foo(a);
			}
		`),

		namedCase('respects a larger minLines option', `
			const a = 1;
			foo({
				a,
			});
			const b = 2;
		`, { options : [ { minLines : 4 } ] }),

		namedCase('accepts a short opening line with no blank line above it', `
			const config = {
				a : 1,
				b : 2,
			};
			if (fbq) {
				fbq('track');
			}
		`),

		namedCase('needs no blank line above control flow that follows a short closing line', `
			foo({
				a : 1,
			});
			if (a) {
				foo();
			}
			return;
		`, { languageOptions : { parserOptions : { ecmaFeatures : { globalReturn : true } } } }),

		namedCase('does not pad a nested statement against the one enclosing it', `
			function run() {
				const a = 1;

				if (a) {
					foo({
						a,
					});
				}

				bar();
			}
		`),

		namedCase('keeps a blank line above a short statement that opens no block', `
			foo({
				a : 1,
			});

			bar();
		`),

		namedCase('accepts a one-line statement directly above the guard that tests it', `
			const hostOk = url.hostname === 'app.asana.com' || url.hostname.endsWith('.asana.com');
			if (!hostOk) {
				throw new Error('Expected an app.asana.com URL');
			}
		`),

		namedCase('accepts a three-line guard directly above its return', `
			async function getAutoIDs() {
				if (!autoIDs) {
					autoIDs = await fetchAutoIDs();
				}
				return autoIDs;
			}
		`),

		namedCase('keeps the blank line between a guard and a return that spans lines', `
			function build() {
				if (!autoIDs) {
					warmCache();
				}

				return {
					autoIDs,
				};
			}
		`),

		namedCase('accepts an if chain followed by a blank line', `
			if (canSaveDraft) {
				showAlert(message);
			}
			else {
				showSuccess(message);
			}

			this.isVisible = false;
		`),

		namedCase('accepts a slightly longer if line with no blank line above it', `
			const config = {
				a : 1,
				b : 2,
			};
			if (a && b) {
				fbq('track');
			}
		`),

		namedCase('still pads a non-if opening line of the same length', `
			const config = {
				a : 1,
				b : 2,
			};

			switch (ab) {
				default:
			}
		`),

		namedCase('still pads an opening line longer than shortLineLength', `
			const config = {
				a : 1,
				b : 2,
			};

			if (fbq && config.a) {
				fbq('track');
			}
		`),

		// Decorators written above an `export` fall outside the exported statement's own range
		namedCase('accepts a decorated export padded by one blank line', `
			export * from './Base';

			@Entity()
			@TableInheritance({ column : { name : '$class' } })
			export class Verification extends Base {
				archive() {}
			}
		`),
	],

	invalid : [
		namedCase('removes a blank line above a short opening line', {
			code : `
				const config = {
					a : 1,
					b : 2,
				};

				if (fbq) {
					fbq('track');
				}
			`,
			output : `
				const config = {
					a : 1,
					b : 2,
				};
				if (fbq) {
					fbq('track');
				}
			`,
			errors : [ { message : unwantedMessage } ],
		}),

		namedCase('removes a blank line above a slightly longer if line', {
			code : `
				const config = {
					a : 1,
					b : 2,
				};

				if (a && b) {
					fbq('track');
				}
			`,
			output : `
				const config = {
					a : 1,
					b : 2,
				};
				if (a && b) {
					fbq('track');
				}
			`,
			errors : [ { message : unwantedMessage } ],
		}),

		namedCase('removes several blank lines above a short opening line', {
			code : `
				const config = {
					a : 1,
					b : 2,
				};



				if (fbq) {
					fbq('track');
				}
			`,
			output : `
				const config = {
					a : 1,
					b : 2,
				};
				if (fbq) {
					fbq('track');
				}
			`,
			errors : [ { message : unwantedMessage } ],
		}),

		namedCase('collapses blank lines above a decorated export without touching the decorators', {
			code : `
				export * from './Base';


				@Entity()
				@TableInheritance({ column : { name : '$class' } })
				export class Verification extends Base {
					archive() {}
				}
			`,
			output : `
				export * from './Base';

				@Entity()
				@TableInheritance({ column : { name : '$class' } })
				export class Verification extends Base {
					archive() {}
				}
			`,
			errors : [ { message } ],
		}),

		// An if chain is more than a guard, so the line above it still takes its blank line
		namedCase('pads a one-line statement above an if chain', {
			code : `
				output.push(footer);
				if (newBuild) {
					output.push(top);
				}
				else {
					output.push(restore);
				}
			`,
			output : `
				output.push(footer);

				if (newBuild) {
					output.push(top);
				}
				else {
					output.push(restore);
				}
			`,
			errors : [ { message } ],
		}),

		namedCase('removes the blank line between a one-line statement and the guard that tests it', {
			code : `
				const hostOk = url.hostname === 'app.asana.com';

				if (!hostOk) {
					throw new Error('Expected an app.asana.com URL');
				}
			`,
			output : `
				const hostOk = url.hostname === 'app.asana.com';
				if (!hostOk) {
					throw new Error('Expected an app.asana.com URL');
				}
			`,
			errors : [ { message : unwantedMessage } ],
		}),

		namedCase('removes the blank line between a guard and its single-line return', {
			code : `
				async function getAutoIDs() {
					if (!autoIDs) {
						autoIDs = await fetchAutoIDs();
					}

					return autoIDs;
				}
			`,
			output : `
				async function getAutoIDs() {
					if (!autoIDs) {
						autoIDs = await fetchAutoIDs();
					}
					return autoIDs;
				}
			`,
			errors : [ { message : unwantedMessage } ],
		}),

		// Only a guard short enough to read with the return is exempt; this one is four lines
		namedCase('pads a longer if statement above its return', {
			code : `
				async function getAutoIDs() {
					if (!autoIDs) {
						await warmCache();
						autoIDs = await fetchAutoIDs();
					}
					return autoIDs;
				}
			`,
			output : `
				async function getAutoIDs() {
					if (!autoIDs) {
						await warmCache();
						autoIDs = await fetchAutoIDs();
					}

					return autoIDs;
				}
			`,
			errors : [ { message } ],
		}),

		// The blank line an if chain needs after it beats the one a short opening line would refuse
		namedCase('pads a short if line that follows an if chain', {
			code : `
				if (verbose) {
					log(a);
				}
				else {
					log(b);
				}
				if (!dryRun) {
					save();
				}
			`,
			output : `
				if (verbose) {
					log(a);
				}
				else {
					log(b);
				}

				if (!dryRun) {
					save();
				}
			`,
			errors : [ { message } ],
		}),

		// An if chain is one statement, so the `}` closing its last branch is not a break the way `});` is
		namedCase('pads what follows an if chain, despite its closing brace', {
			code : `
				if (canSaveDraft) {
					showAlert(message);
				}
				else {
					showSuccess(message);
				}
				this.isVisible = false;
			`,
			output : `
				if (canSaveDraft) {
					showAlert(message);
				}
				else {
					showSuccess(message);
				}

				this.isVisible = false;
			`,
			errors : [ { message } ],
		}),

		namedCase('pads a multi-line await where both neighbouring lines are long', {
			code : `
				async function load(table) {
					await table.hardReset({
						filter : { status : 'current' },
						limit  : 15,
					});
					const currentLoad = table.loadMore();
					await table.hardReset({
						filter : { status : 'former' },
						limit  : 15,
					});
					const formerLoad = table.loadMore();
				}
			`,
			output : `
				async function load(table) {
					await table.hardReset({
						filter : { status : 'current' },
						limit  : 15,
					});
					const currentLoad = table.loadMore();

					await table.hardReset({
						filter : { status : 'former' },
						limit  : 15,
					});
					const formerLoad = table.loadMore();
				}
			`,
			errors : [ { message } ],
		}),

		// Both sides are multi-line, so the `});` between them stops standing in for the blank line
		namedCase('pads two multi-line statements even across a short closing line', {
			code : `
				items = _.sortBy(items, item => {
					return item.name;
				});
				if (request.sort.desc) {
					items = items.reverse();
				}
			`,
			output : `
				items = _.sortBy(items, item => {
					return item.name;
				});

				if (request.sort.desc) {
					items = items.reverse();
				}
			`,
			errors : [ { message } ],
		}),

		// The line above is long, so `foo({` keeps one blank line rather than losing it
		namedCase('collapses excess blank lines above a short opening line', {
			code : `
				const a = 1;


				foo({
					a,
				});
			`,
			output : `
				const a = 1;

				foo({
					a,
				});
			`,
			errors : [ { message } ],
		}),

		namedCase('inserts the blank line above a leading comment', {
			code : `
				foo({
					a : 1,
				}); // Trailing comment
				// Explains bar
				bar();
			`,
			output : `
				foo({
					a : 1,
				}); // Trailing comment

				// Explains bar
				bar();
			`,
			errors : [ { message } ],
		}),

		namedCase('collapses excess blank lines on either side of a comment', {
			code : `
				foo({
					a : 1,
				});


				// Explains bar


				bar();
			`,
			output : `
				foo({
					a : 1,
				});

				// Explains bar

				bar();
			`,
			errors : [ { message } ],
		}),

		namedCase('pads statements inside switch cases', {
			code : `
				switch (a) {
					case 1:
						foo({
							a,
						}).then(done);
						reportSomething(a);
				}
			`,
			output : `
				switch (a) {
					case 1:
						foo({
							a,
						}).then(done);

						reportSomething(a);
				}
			`,
			errors : [ { message } ],
		}),

		namedCase('pads a multi-line import against the code that follows it', {
			code : `
				import {
					a,
					b,
				} from 'a';
				renderEverything(a, b);
			`,
			output : `
				import {
					a,
					b,
				} from 'a';

				renderEverything(a, b);
			`,
			errors : [ { message } ],
		}),

		namedCase('respects a smaller minLines option', {
			code : `
				const a = 1;
				foo(aLongerName,
					2);
			`,
			output : `
				const a = 1;

				foo(aLongerName,
					2);
			`,
			options : [ { minLines : 2 } ],
			errors  : [ { message } ],
		}),
	],
});
