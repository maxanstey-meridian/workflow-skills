## Frontend Laws

Each line is a summary; the file in brackets (a rule file, or a design document
and the heading in it) states it in full. These Laws apply together with the
cross-stack Laws in the Laws file beside this one.

- the API is not the information architecture: UI language and ordering follow
  the user's journey and desired outcomes, not transport models, backend
  operations, configuration variants, or implementation sequence
  [`ui/core-law.md`]
- provide implementations, not projections: a page that needs more of a
  capability widens its port; it doesn't unpack it, repack it, or add getters
  to hand out pieces
  [`frontend/page-ports-and-adapters.md#provide-implementations-not-projections`]
- frontend composition happens only in Nuxt shells: `app.vue`, layouts, and
  pages provide capabilities/contexts with `provideX`; components and
  composables only inject them with `injectX`
  [`frontend/page-ports-and-adapters.md#nuxt-shells-as-composition-roots`]
