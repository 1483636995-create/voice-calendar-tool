# PR 15: Risk Hardening

## Scope

- Fix the default reminder lead time to 30 minutes.
- Add backend CORS allowlist support.
- Add optional API key protection for public backend deployments.
- Limit title, note and source text length on both frontend fallback storage and backend API validation.
- Document online LocalStorage behavior and optional public API security configuration.
- Update Render deployment config with API key, CORS and persistent file path settings.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Reminder smoke checks should confirm default lead time is 30 minutes and explicit user lead time still overrides it.
- Backend schema smoke checks should reject oversized titles.
- Public frontend should still work without `VITE_API_BASE_URL` by falling back to LocalStorage.
