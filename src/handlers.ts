import process from "node:process";

// Base URLs — the reports API is on a separate subdomain!
const MAIN_API_BASE = "https://api.clockify.me/api/v1";
const REPORTS_API_BASE = "https://reports.api.clockify.me/v1";

// Helper to get API key from environment
function getApiKey(): string {
  const apiKey = process.env.CLOCKIFY_API_KEY;
  if (!apiKey) {
    throw new Error("CLOCKIFY_API_KEY is not set in MCP config.");
  }
  return apiKey;
}

// Helper to call the main Clockify API
async function clockifyFetch(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = MAIN_API_BASE,
) {
  const apiKey = getApiKey();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const headers = {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[Error] Clockify API ${url} failed: ${response.status} ${text}`,
    );
    throw new Error(`Clockify API error: ${response.status} ${text}`);
  }
  return response.json();
}

// Helper to call the Clockify Reports API (separate subdomain)
async function clockifyReportsFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  return clockifyFetch(endpoint, options, REPORTS_API_BASE);
}

// Handler for listing available tools
export async function listToolsHandler() {
  return {
    tools: [
      {
        name: "listProjects",
        description:
          "List projects in the workspace. Supports filtering by name, archived status, and billable status. Paginates automatically.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Filter by project name (partial match, optional)",
            },
            archived: {
              type: "boolean",
              description:
                "true = archived only, false = active only, omit for all (optional)",
            },
            billable: {
              type: "boolean",
              description: "Filter by billable status (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "getTimeEntries",
        description:
          "List time entries for the currently authenticated user. Optional: start, end (ISO8601), hydrated (include full project/task/tag objects).",
        inputSchema: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Start date (ISO8601, optional)",
            },
            end: {
              type: "string",
              description: "End date (ISO8601, optional)",
            },
            hydrated: {
              type: "boolean",
              description:
                "If true, returns full project/task/tag objects instead of just IDs (optional, default: false)",
            },
            project: {
              type: "string",
              description: "Filter by project ID (optional)",
            },
            description: {
              type: "string",
              description: "Filter by description text (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "addTimeEntry",
        description:
          "Add a time entry. If end is omitted, starts a running timer. Optional: taskId, billable, tagIds.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Clockify project ID (optional)",
            },
            taskId: {
              type: "string",
              description: "Task ID (optional, requires projectId to be set)",
            },
            description: {
              type: "string",
              description: "Description of the time entry (optional)",
            },
            start: {
              type: "string",
              description: "Start time (ISO8601, required)",
            },
            end: {
              type: "string",
              description:
                "End time (ISO8601, optional — omit to start a running timer)",
            },
            billable: {
              type: "boolean",
              description:
                "Mark as billable (optional, defaults to project setting)",
            },
            tagIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of tag IDs to attach (optional)",
            },
          },
          required: ["start"],
        },
      },
      {
        name: "updateTimeEntry",
        description: "Update an existing time entry by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            timeEntryId: {
              type: "string",
              description: "ID of the time entry to update",
            },
            projectId: {
              type: "string",
              description: "New project ID (optional)",
            },
            taskId: {
              type: "string",
              description: "New task ID (optional)",
            },
            description: {
              type: "string",
              description: "New description (optional)",
            },
            start: {
              type: "string",
              description: "New start time (ISO8601, optional)",
            },
            end: {
              type: "string",
              description: "New end time (ISO8601, optional)",
            },
            billable: {
              type: "boolean",
              description: "Billable flag (optional)",
            },
            tagIds: {
              type: "array",
              items: { type: "string" },
              description: "New array of tag IDs (optional)",
            },
          },
          required: ["timeEntryId"],
        },
      },
      {
        name: "deleteTimeEntry",
        description: "Delete a time entry by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            timeEntryId: {
              type: "string",
              description: "ID of the time entry to delete",
            },
          },
          required: ["timeEntryId"],
        },
      },
      {
        name: "listUsers",
        description:
          "List all users in the workspace. Supports filtering by name, email, and status.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Filter by name (optional)",
            },
            email: {
              type: "string",
              description: "Filter by email (optional)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "PENDING", "DECLINED"],
              description: "Filter by user status (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "getUserTimeEntries",
        description:
          "List time entries for a specific user by their ID. Optional: start, end (ISO8601), hydrated.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string", description: "User ID" },
            start: {
              type: "string",
              description: "Start date (ISO8601, optional)",
            },
            end: {
              type: "string",
              description: "End date (ISO8601, optional)",
            },
            hydrated: {
              type: "boolean",
              description:
                "If true, returns full project/task/tag objects (optional, default: false)",
            },
            project: {
              type: "string",
              description: "Filter by project ID (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "getSummaryReport",
        description:
          "Get a summary report of hours grouped by user and/or project for a date range. Uses the Clockify Reports API.",
        inputSchema: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Start date (ISO8601, required)",
            },
            end: {
              type: "string",
              description: "End date (ISO8601, required)",
            },
            groups: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "USER",
                  "PROJECT",
                  "CLIENT",
                  "TASK",
                  "TAG",
                  "TIMEENTRY",
                  "DATE",
                ],
              },
              description:
                'Up to 3 grouping levels (default: ["USER", "PROJECT"])',
            },
            userIds: {
              type: "array",
              items: { type: "string" },
              description: "Filter by user IDs (optional)",
            },
            projectIds: {
              type: "array",
              items: { type: "string" },
              description: "Filter by project IDs (optional)",
            },
            billable: {
              type: "boolean",
              description: "Filter by billable status (optional)",
            },
          },
          required: ["start", "end"],
        },
      },
      {
        name: "getDetailedReport",
        description:
          "Get a detailed time entry report for a date range. Returns individual time entries with all metadata.",
        inputSchema: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Start date (ISO8601, required)",
            },
            end: {
              type: "string",
              description: "End date (ISO8601, required)",
            },
            userIds: {
              type: "array",
              items: { type: "string" },
              description: "Filter by user IDs (optional)",
            },
            projectIds: {
              type: "array",
              items: { type: "string" },
              description: "Filter by project IDs (optional)",
            },
            description: {
              type: "string",
              description: "Filter by description text (optional)",
            },
            billable: {
              type: "boolean",
              description: "Filter by billable status (optional)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 50, max: 1000)",
            },
          },
          required: ["start", "end"],
        },
      },
      {
        name: "getUserTimeEntriesByName",
        description:
          "List time entries for a user identified by name (case-insensitive, partial match). Optional: start, end (ISO8601), hydrated.",
        inputSchema: {
          type: "object",
          properties: {
            userName: {
              type: "string",
              description: "User name (partial/case-insensitive)",
            },
            start: {
              type: "string",
              description: "Start date (ISO8601, optional)",
            },
            end: {
              type: "string",
              description: "End date (ISO8601, optional)",
            },
            hydrated: {
              type: "boolean",
              description:
                "If true, returns full project/task/tag objects (optional, default: false)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: ["userName"],
        },
      },
      {
        name: "listTags",
        description: "List all tags in the workspace.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Filter by tag name (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "listClients",
        description: "List all clients in the workspace.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Filter by client name (optional)",
            },
            pageSize: {
              type: "number",
              description: "Results per page (default: 200, max: 5000)",
            },
            page: {
              type: "number",
              description: "Page number (1-based, default: 1)",
            },
          },
          required: [],
        },
      },
    ],
  };
}

interface MCPCallToolRequest {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

// Build a query string from a params object, skipping undefined/null values
function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

// Handler for calling a tool
export async function callToolHandler(request: MCPCallToolRequest) {
  // Get the authenticated user — provides activeWorkspace and userId
  const user = await clockifyFetch("/user");
  const workspaceId = user.activeWorkspace;
  const userId = user.id;

  const args = request.params.arguments || {};

  switch (request.params.name) {
    case "listProjects": {
      const { name, archived, billable, pageSize = 200, page = 1 } = args;
      const query = buildQuery({
        name: typeof name === "string" ? name : undefined,
        archived: typeof archived === "boolean" ? archived : undefined,
        billable: typeof billable === "boolean" ? billable : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const projects = await clockifyFetch(
        `/workspaces/${workspaceId}/projects${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      };
    }

    case "getTimeEntries": {
      const {
        start,
        end,
        hydrated,
        project,
        description,
        pageSize = 200,
        page = 1,
      } = args;
      const query = buildQuery({
        start: typeof start === "string" ? start : undefined,
        end: typeof end === "string" ? end : undefined,
        hydrated: typeof hydrated === "boolean" ? hydrated : undefined,
        project: typeof project === "string" ? project : undefined,
        description: typeof description === "string" ? description : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const entries = await clockifyFetch(
        `/workspaces/${workspaceId}/user/${userId}/time-entries${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    }

    case "addTimeEntry": {
      const { projectId, taskId, description, start, end, billable, tagIds } =
        args;
      if (!start || typeof start !== "string") {
        throw new Error("start is required (ISO8601 string)");
      }
      if (taskId && !projectId) {
        throw new Error("projectId is required when taskId is provided");
      }
      const body: Record<string, unknown> = { start };
      if (typeof end === "string" && end) body.end = end;
      if (typeof description === "string" && description)
        body.description = description;
      if (typeof projectId === "string" && projectId)
        body.projectId = projectId;
      if (typeof taskId === "string" && taskId) body.taskId = taskId;
      if (typeof billable === "boolean") body.billable = billable;
      if (Array.isArray(tagIds) && tagIds.length) body.tagIds = tagIds;

      const entry = await clockifyFetch(
        `/workspaces/${workspaceId}/time-entries`,
        { method: "POST", body: JSON.stringify(body) },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }

    case "updateTimeEntry": {
      const {
        timeEntryId,
        projectId,
        taskId,
        description,
        start,
        end,
        billable,
        tagIds,
      } = args;
      if (!timeEntryId || typeof timeEntryId !== "string") {
        throw new Error("timeEntryId is required");
      }
      // Fetch existing entry to merge with updates
      const existing = await clockifyFetch(
        `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      );
      const body: Record<string, unknown> = {
        start:
          typeof start === "string" && start
            ? start
            : existing.timeInterval?.start,
        end: typeof end === "string" && end ? end : existing.timeInterval?.end,
        description:
          typeof description === "string"
            ? description
            : (existing.description ?? ""),
        projectId:
          typeof projectId === "string" && projectId
            ? projectId
            : (existing.projectId ?? null),
        taskId:
          typeof taskId === "string" && taskId
            ? taskId
            : (existing.taskId ?? null),
        billable:
          typeof billable === "boolean"
            ? billable
            : (existing.billable ?? false),
        tagIds: Array.isArray(tagIds) ? tagIds : (existing.tagIds ?? []),
      };
      const updated = await clockifyFetch(
        `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }

    case "deleteTimeEntry": {
      const { timeEntryId } = args;
      if (!timeEntryId || typeof timeEntryId !== "string") {
        throw new Error("timeEntryId is required");
      }
      await clockifyFetch(
        `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
        { method: "DELETE" },
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, deleted: timeEntryId },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "listUsers": {
      const { name, email, status, pageSize = 200, page = 1 } = args;
      const query = buildQuery({
        name: typeof name === "string" ? name : undefined,
        email: typeof email === "string" ? email : undefined,
        status: typeof status === "string" ? status : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const users = await clockifyFetch(
        `/workspaces/${workspaceId}/users${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      };
    }

    case "getUserTimeEntries": {
      const {
        userId: targetUserId,
        start,
        end,
        hydrated,
        project,
        pageSize = 200,
        page = 1,
      } = args;
      if (!targetUserId || typeof targetUserId !== "string") {
        throw new Error("userId is required");
      }
      const query = buildQuery({
        start: typeof start === "string" ? start : undefined,
        end: typeof end === "string" ? end : undefined,
        hydrated: typeof hydrated === "boolean" ? hydrated : undefined,
        project: typeof project === "string" ? project : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const entries = await clockifyFetch(
        `/workspaces/${workspaceId}/user/${targetUserId}/time-entries${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    }

    case "getSummaryReport": {
      const { start, end, groups, userIds, projectIds, billable } = args;
      if (!start || !end) {
        throw new Error("start and end are required");
      }
      // The reports API uses dateRangeStart/dateRangeEnd, and summaryFilter.groups
      const resolvedGroups =
        Array.isArray(groups) && groups.length > 0
          ? groups
          : ["USER", "PROJECT"];
      const body: Record<string, unknown> = {
        dateRangeStart: start,
        dateRangeEnd: end,
        summaryFilter: {
          groups: resolvedGroups,
        },
        sortOrder: "ASCENDING",
        exportType: "JSON",
      };
      if (Array.isArray(userIds) && userIds.length) {
        body.users = { ids: userIds, contains: "CONTAINS", status: "ALL" };
      }
      if (Array.isArray(projectIds) && projectIds.length) {
        body.projects = {
          ids: projectIds,
          contains: "CONTAINS",
          status: "ALL",
        };
      }
      if (typeof billable === "boolean") {
        body.billable = billable;
      }
      // IMPORTANT: Reports API uses a different base URL
      const report = await clockifyReportsFetch(
        `/workspaces/${workspaceId}/reports/summary`,
        { method: "POST", body: JSON.stringify(body) },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    }

    case "getDetailedReport": {
      const {
        start,
        end,
        userIds,
        projectIds,
        description,
        billable,
        page = 1,
        pageSize = 50,
      } = args;
      if (!start || !end) {
        throw new Error("start and end are required");
      }
      const body: Record<string, unknown> = {
        dateRangeStart: start,
        dateRangeEnd: end,
        detailedFilter: {
          page: typeof page === "number" ? page : 1,
          pageSize: Math.min(
            typeof pageSize === "number" ? pageSize : 50,
            1000,
          ),
          sortColumn: "DATE",
        },
        sortOrder: "ASCENDING",
        exportType: "JSON",
      };
      if (Array.isArray(userIds) && userIds.length) {
        body.users = { ids: userIds, contains: "CONTAINS", status: "ALL" };
      }
      if (Array.isArray(projectIds) && projectIds.length) {
        body.projects = {
          ids: projectIds,
          contains: "CONTAINS",
          status: "ALL",
        };
      }
      if (typeof description === "string" && description) {
        body.description = description;
      }
      if (typeof billable === "boolean") {
        body.billable = billable;
      }
      const report = await clockifyReportsFetch(
        `/workspaces/${workspaceId}/reports/detailed`,
        { method: "POST", body: JSON.stringify(body) },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    }

    case "getUserTimeEntriesByName": {
      const { userName, start, end, hydrated, pageSize = 200, page = 1 } = args;
      if (!userName || typeof userName !== "string") {
        throw new Error("userName is required");
      }
      // Fetch users and find by name (case-insensitive partial match)
      const users: Array<{ id: string; name: string }> = await clockifyFetch(
        `/workspaces/${workspaceId}/users?page-size=500`,
      );
      const userMatch = users.find(
        (u) => u.name && u.name.toLowerCase().includes(userName.toLowerCase()),
      );
      if (!userMatch) {
        throw new Error(`No user found matching name: ${userName}`);
      }
      const query = buildQuery({
        start: typeof start === "string" ? start : undefined,
        end: typeof end === "string" ? end : undefined,
        hydrated: typeof hydrated === "boolean" ? hydrated : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const entries = await clockifyFetch(
        `/workspaces/${workspaceId}/user/${userMatch.id}/time-entries${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    }

    case "listTags": {
      const { name, pageSize = 200, page = 1 } = args;
      const query = buildQuery({
        name: typeof name === "string" ? name : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const tags = await clockifyFetch(
        `/workspaces/${workspaceId}/tags${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
      };
    }

    case "listClients": {
      const { name, pageSize = 200, page = 1 } = args;
      const query = buildQuery({
        name: typeof name === "string" ? name : undefined,
        "page-size": typeof pageSize === "number" ? pageSize : 200,
        page: typeof page === "number" ? page : 1,
      });
      const clients = await clockifyFetch(
        `/workspaces/${workspaceId}/clients${query}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(clients, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
}

export { getApiKey, clockifyFetch };
