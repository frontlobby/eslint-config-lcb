# class-methods-newline

Requires exactly one blank line between consecutive class methods and after the final class method.
This includes constructors, getters, setters, and static methods. Other class members, such as
fields and static blocks, are not considered by the rule.

An adjacent getter and setter with the same name are treated as a coupled pair and must not have a
blank line between them.

TypeScript overload declarations for the same method, including constructor overloads, are treated
as a group and must not have blank lines between them or between the final declaration and its
implementation.

VS Code `#region` and `#endregion` comments may have one surrounding blank line. Excess
consecutive blank lines around the marked group of methods are removed automatically.

A JSDoc block immediately before a class method is treated as part of that method. The rule checks
and fixes the gap above the JSDoc block rather than the gap between the comment and the method.

```ts
// Correct
class Example {
	first() {}

	get value() { return 1; }
	set value(value) {}

}

// Incorrect
class Example {
	first() {}
	second() {}
}

class Formatter {
	format(value: string): string;
	format(value: number): string;
	format(value: string | number): string {
		return String(value);
	}

}
```

The rule automatically fixes whitespace-only gaps. When a comment lies between methods, it reports
an invalid gap without applying a fix so that comments are never moved or removed.
