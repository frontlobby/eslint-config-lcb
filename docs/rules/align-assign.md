# Align assignment statements

This rule aims to ensure that all assignment statements are aligned on their equals signs

The rule supports code auto fixing the code

## Options:
Optionally, you may specify a `maxSpaces` object property:
```js
"align-assign" : [ "error", { "maxSpaces" : 20 } ]
```

This indicates the max number of spaces inserted before an `=` on a line compared to the line
directly before or after it. The default value is `25`.

## Examples:
```js
let a = 3;
a      = 2;
a += 2;
a >>>= 5;
```
Gets autofixed to:
```js
let a    = 3;
a        = 2;
a        = 2;
a       += 2;
a     >>>= 5;
```

---

With `maxSpaces : 20`,
```js
thisVariableHas22Chars = 22;
a = 2;
```
is legal, but when `maxSpaces : 25`, it gets autofixed to
```js
thisVariableHas22Chars = 22;
a                      = 1;
```
At the same time,
```js
thisVariableHas22Chars = 22;
thisOneHas12           = 12;
a                      = 1;
```
is the expected alignment for both `maxSpaces : 20` and `maxSpaces : 25`, since it only compares
lines that are directly beside each other
