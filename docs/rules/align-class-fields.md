# Align class field initializers

This rule aligns the `=` tokens of initialized class fields that appear on consecutive lines in the same class body. A blank line, a method, or any non-field class member starts a new alignment group.

The rule only changes single-line fields with initializers, so multiline fields and declarations without an initializer are left unchanged.

## Options

Optionally, set `maxSpaces` to limit how far apart adjacent field names may be before they form separate groups. The default is `25`.

```js
'local-rules/align-class-fields' : [ 'error', { maxSpaces : 20 } ]
```

## Example

```ts
class Settings {
	name = 'default';
	maximumRetries = 3;
}
```

Gets autofixed to:

```ts
class Settings {
	name           = 'default';
	maximumRetries = 3;
}
```
