## Write expectations in contract terms

**Default:** Write `expect` strings in product and HTTP contract terms — status code, declared error `code`, key response fields, authorisation or ownership rules, and durable state changes — never internal class or repository calls.

**When:** Drafting or editing `expect` on any `api-contract` row.

Bad: `expect: "Calls FormRepository.AddAsync and returns OkObjectResult."`
Good: `expect: "201 with created form id and name; form row persisted for the authenticated tenant."`
