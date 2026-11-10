## Rule out an invalid value with the smallest tool

**Default:** Rule out an invalid value with the first of these that is enough: a precise static type or discriminated union, runtime schema validation at an untrusted boundary, then a parser or value object (a type whose construction checks its input) only when it makes invalid construction impossible or removes duplicated validation.

**When:** A value whose shape or range can be wrong, on any stack.

Bad: A `Quantity` class wrapping every integer in the codebase.
Good: `quantity: number` checked once by the request schema.
