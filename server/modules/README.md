# Server modules

Each future business feature is self-contained in its own module. Do not create CRM modules until their domain requirements are defined.

```text
server/modules/<feature>/
├── <feature>.controller.ts  # HTTP adapter: request → schema → service → response
├── <feature>.service.ts     # business rules and transaction boundaries
├── <feature>.repository.ts  # Prisma reads and writes only
├── <feature>.queries.ts     # read models, filters, pagination, includes
├── <feature>.schema.ts      # Zod input schemas
├── <feature>.policy.ts      # authorization rules
├── <feature>.types.ts       # feature DTOs and domain types
├── <feature>.actions.ts     # thin Server Actions, when the UI needs them
└── index.ts                 # the feature's public API
```

Keep Route Handlers in `src/app/api` to one import and exported methods. Controllers must not contain business rules, services must not access `Request` or `Response`, and repositories must not validate input or enforce permissions.
