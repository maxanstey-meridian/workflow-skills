## Map objects by hand without AutoMapper

**Default:** Map between types with explicit code; do not use AutoMapper.

**When:** C# code.

Bad: `mapper.Map<FormDto>(form)`
Good: `new FormDto(form.Id, form.Name)`
