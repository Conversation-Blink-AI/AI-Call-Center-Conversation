# Forex Organization Switching Follow-Up

The auth layer now preserves `activeRole`, `activeOrgId`, `orgMemberships`, and root `permissions`, and `useAuth()` exposes derived permission helpers. Organization switching should be added after the backend confirms the switch endpoint path and response shape.

## Backend Details Needed

- Endpoint path for switching context.
- Request body shape, expected to be similar to `{ "orgId": "..." }` or `{ "orgId": null }`.
- Response token field, expected to be a new FOREX JWT containing updated `activeOrgId` and `activeRole`.

## UI/API Work After Confirmation

1. Add a local proxy route such as `POST /api/auth/switch-context`.
2. Forward the selected `orgId` and current external token to the FOREX switch endpoint.
3. Store the returned external token in the local user record and local session response.
4. Re-run `/api/auth/me` so `useAuth()` gets the new `activeRole`, `activeOrgId`, and effective permissions.
5. Add an org switcher to the authenticated shell showing Personal plus active `orgMemberships`.
6. Add org-aware route handling for `/o/:orgId/...` once route ownership is agreed.
