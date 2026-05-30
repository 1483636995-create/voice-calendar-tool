# PR 13: Deployment Setup

## Scope

- Add a GitHub Pages workflow for the public frontend demo.
- Configure the Vite base path for the repository Pages URL.
- Keep the online frontend usable without judge-side API configuration by falling back to LocalStorage.
- Add a Render Blueprint for deploying the optional Express API when a cloud account is connected.
- Document the deployment URL and API configuration path.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- `GITHUB_PAGES=true npm run build` should produce assets with the `/voice-calendar-tool/` base path.
- After this PR is merged, GitHub Actions should publish the frontend to GitHub Pages.
- If a public backend API is deployed later, set repository variable `VITE_API_BASE_URL` to its `/api` URL and rerun the Pages workflow.
