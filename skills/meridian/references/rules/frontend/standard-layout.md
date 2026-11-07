## Standard Layout

Page-local code is colocated by default.

```text
app/pages/forms/
├── index.vue
├── [id].vue
├── components/
├── composables/
├── logic/
├── ports/
└── adapters/
```

For the root page, use an adjacent folder:

```text
app/pages/
├── index.vue
└── index/
    ├── components/
    ├── composables/
    ├── logic/
    ├── ports/
    └── adapters/
```

Do not promote code until its ownership and lifetime require it.
