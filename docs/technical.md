# Technical Documentation

## Tech Stack

- **Language:** TypeScript (Node.js)
- **MCP SDK:** @modelcontextprotocol/sdk
- **HTTP Client:** Native fetch (Node 18+)
- **Containerization:** Docker (primary deployment method)

## Clockify API URLs

Two separate base URLs are used — this is critical:

| API | Base URL |
|-----|----------|
| Main API | `https://api.clockify.me/api/v1` |
| Reports API | `https://reports.api.clockify.me/v1` |

The reports API lives on a different subdomain and has a different path prefix (`/v1` not `/api/v1`). Using the main API URL for report endpoints will return errors.

## MCP Tools Implemented

### Time Entries
- **getTimeEntries:** Lists time entries for the authenticated user, with optional `start`/`end` date filters, `hydrated` mode (returns full project/task/tag objects), project filter, and pagination.
- **addTimeEntry:** Creates a time entry. Only `start` is required — if `end` is omitted, starts a running timer. Optional: `projectId`, `taskId`, `description`, `billable`, `tagIds`.
- **updateTimeEntry:** Updates an existing time entry by ID. Fetches the current state and merges in the provided fields.
- **deleteTimeEntry:** Deletes a time entry by ID.

### Users
- **listUsers:** Lists all users in the workspace. Optional filters: `name`, `email`, `status` (`ACTIVE`/`INACTIVE`/`PENDING`/`DECLINED`).
- **getUserTimeEntries:** Lists time entries for a specific user ID. Optional: `start`, `end`, `hydrated`, `project`, pagination.
- **getUserTimeEntriesByName:** Lists time entries for a user matched by name (case-insensitive partial match). Looks up the user first via `listUsers`, then fetches entries.

### Projects
- **listProjects:** Lists projects in the workspace. Optional filters: `name`, `archived`, `billable`. Supports pagination.

### Tags & Clients
- **listTags:** Lists all tags in the workspace. Optional name filter.
- **listClients:** Lists all clients in the workspace. Optional name filter.

### Reports (Reports API)
- **getSummaryReport:** Gets a summary report grouped by up to 3 dimensions (`USER`, `PROJECT`, `CLIENT`, `TASK`, `TAG`, `TIMEENTRY`, `DATE`). Defaults to `["USER", "PROJECT"]`. Optional filters: `userIds`, `projectIds`, `billable`. Uses `dateRangeStart`/`dateRangeEnd` and `summaryFilter.groups` per the Clockify Reports API spec.
- **getDetailedReport:** Gets individual time entries for a date range. Supports filtering by `userIds`, `projectIds`, `description`, `billable`. Pagination via `page`/`pageSize` (max 1000 per page per Clockify limit).

## Authentication

- The Clockify API key is provided via `CLOCKIFY_API_KEY` environment variable.
- The API key is sent in the `X-Api-Key` header for all requests (both main and reports API).

## Pagination

All list endpoints default to `page-size=200`. The maximum is 5000 for most endpoints, 1000 for report endpoints. Callers can pass `page` and `pageSize` arguments to paginate through large result sets.

## Running the Server

- **Primary (Docker):**
  - Build: `docker build -t clockify-mcp .`
  - Run: `docker run -e CLOCKIFY_API_KEY=YOUR_API_KEY clockify-mcp`
- **Alternative (Local Node.js):**
  - Install dependencies: `pnpm install`
  - Build: `pnpm build`
  - Run: `node build/index.js`

## Error Handling & Logging

- All API errors are logged to stderr with the URL and status code.
- The server throws descriptive errors for missing config, failed API calls, or invalid tool arguments.
- Clockify API errors include the response body text for diagnosis.
