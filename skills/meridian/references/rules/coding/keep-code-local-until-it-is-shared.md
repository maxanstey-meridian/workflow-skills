## Keep code local until it is shared

**Default:** Keep code beside its one consumer, and promote it only when it has more than one real consumer, stable enough ownership, and clearer value shared than duplicated.

**When:** Any stack, before moving code to a shared, common, or feature folder.

Bad: A date formatter used by one page moved to `shared/` "for reuse".
Good: The formatter left in the page's folder until a second page needs it.
