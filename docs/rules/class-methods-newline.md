# class-methods-newline

Requires exactly one blank line between consecutive class methods and after the final class method.
This includes constructors, getters, setters, and static methods. Other class members, such as
fields and static blocks, are not considered by the rule.

An adjacent getter and setter with the same name are treated as a coupled pair and must not have a
blank line between them.

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
```

The rule automatically fixes whitespace-only gaps. When a comment lies between methods, it reports
an invalid gap without applying a fix so that comments are never moved or removed.
