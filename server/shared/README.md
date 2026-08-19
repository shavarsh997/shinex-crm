# Shared server code

Keep server-only cross-cutting code here when it is genuinely shared between feature modules:

- `errors/` for typed application errors;
- `validation/` for reusable validation primitives;
- `http/` for controller error mapping and HTTP response conventions;
- `pagination/` for reusable list pagination;
- `utils/` for server-only utilities.

Feature-specific validation and helpers stay inside their own module under `server/modules`.
