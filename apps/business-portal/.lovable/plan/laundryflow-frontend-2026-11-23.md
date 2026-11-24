# LaundryFlow frontend

## Build
- Replace the blank home screen with a polished, responsive laundry operations dashboard and shared navigation.
- Add working dashboard, orders, branches, and employees views with reusable tables, metrics, charts, dialogs, and demo data.
- Add login, registration, password recovery, and business onboarding screens as presentation-only flows; do not simulate real authentication.
- Keep sample records separate from UI logic and add an API service boundary configured through environment variables for future Express integration.
- Exclude customer and super-admin portals; keep secondary modules out of this first-generation scope.

## Technical direction
- Preserve the repository's supported TanStack Start/React/TypeScript setup and use its file-based routing, semantic design tokens, and installed UI/chart/icon packages.
- Organize new code into feature pages, reusable components, demo data, and API services. No database, external credentials, or authentication provider will be configured.
- Verify the home route, requested primary screens, responsive behavior, and project checks after implementation.