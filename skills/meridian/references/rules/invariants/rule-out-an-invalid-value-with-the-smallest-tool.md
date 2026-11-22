## Rule out an invalid value with the smallest tool

**Default:** Rule out invalid values with the smallest tool that suffices: a precise static type or discriminated union, runtime schema validation at untrusted boundaries, and a parser or value object only when it prevents invalid construction or removes duplicated validation.

**When:** Any value whose shape or range can be invalid, on any stack.

Bad: Wrapping every integer in a `Quantity` class.
Good: `quantity: number` validated once by the request schema.
