import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { listToolsHandler, callToolHandler } from "../src/handlers";

let fetchMock: Mock;

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock = vi.fn();
  global.fetch = fetchMock;
  process.env.CLOCKIFY_API_KEY = "dummy-key";
});

// Helper: mock the /user endpoint (always the first fetch call)
function mockUser() {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ activeWorkspace: "ws1", id: "user1" }),
  });
}

describe("listToolsHandler", () => {
  it("returns all expected tools", async () => {
    const result = await listToolsHandler();
    const toolNames = result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("listProjects");
    expect(toolNames).toContain("getTimeEntries");
    expect(toolNames).toContain("addTimeEntry");
    expect(toolNames).toContain("updateTimeEntry");
    expect(toolNames).toContain("deleteTimeEntry");
    expect(toolNames).toContain("listUsers");
    expect(toolNames).toContain("getUserTimeEntries");
    expect(toolNames).toContain("getSummaryReport");
    expect(toolNames).toContain("getDetailedReport");
    expect(toolNames).toContain("getUserTimeEntriesByName");
    expect(toolNames).toContain("listTags");
    expect(toolNames).toContain("listClients");
  });

  it("addTimeEntry only requires start", async () => {
    const result = await listToolsHandler();
    const tool = result.tools.find(
      (t: { name: string }) => t.name === "addTimeEntry",
    );
    expect(tool?.inputSchema.required).toEqual(["start"]);
  });

  it("getSummaryReport has groups enum in schema", async () => {
    const result = await listToolsHandler();
    const tool = result.tools.find(
      (t: { name: string }) => t.name === "getSummaryReport",
    );
    const groupsEnum = tool?.inputSchema.properties.groups.items.enum;
    expect(groupsEnum).toContain("USER");
    expect(groupsEnum).toContain("PROJECT");
    expect(groupsEnum).toContain("CLIENT");
    expect(groupsEnum).toContain("DATE");
  });
});

describe("listProjects", () => {
  it("calls the projects endpoint and returns results", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "p1", name: "Project 1" }],
    });
    const result = await callToolHandler({
      params: { name: "listProjects", arguments: {} },
    });
    const projects = JSON.parse(result.content[0].text);
    expect(projects[0].name).toBe("Project 1");
    // Verify the URL includes the default page-size
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("page-size=200");
  });

  it("passes name and archived filters", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await callToolHandler({
      params: {
        name: "listProjects",
        arguments: { name: "Test", archived: false },
      },
    });
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("name=Test");
    expect(callUrl).toContain("archived=false");
  });
});

describe("getTimeEntries", () => {
  it("returns time entries for the current user", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "te1", description: "Worked on X" }],
    });
    const result = await callToolHandler({
      params: { name: "getTimeEntries", arguments: {} },
    });
    const entries = JSON.parse(result.content[0].text);
    expect(entries[0].description).toBe("Worked on X");
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("/user/user1/time-entries");
  });

  it("passes start/end and hydrated params", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await callToolHandler({
      params: {
        name: "getTimeEntries",
        arguments: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
          hydrated: true,
        },
      },
    });
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("start=");
    expect(callUrl).toContain("end=");
    expect(callUrl).toContain("hydrated=true");
  });
});

describe("addTimeEntry", () => {
  it("creates a time entry with all required and optional fields", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "te2", description: "Added entry" }),
    });
    const result = await callToolHandler({
      params: {
        name: "addTimeEntry",
        arguments: {
          projectId: "p1",
          taskId: "task1",
          description: "Added entry",
          start: "2024-01-01T09:00:00Z",
          end: "2024-01-01T17:00:00Z",
          billable: true,
          tagIds: ["tag1", "tag2"],
        },
      },
    });
    const entry = JSON.parse(result.content[0].text);
    expect(entry.description).toBe("Added entry");
    // Verify request body
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.projectId).toBe("p1");
    expect(body.taskId).toBe("task1");
    expect(body.billable).toBe(true);
    expect(body.tagIds).toEqual(["tag1", "tag2"]);
  });

  it("allows creating a time entry with only start (running timer)", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "te3", timeInterval: { start: "2024-01-01T09:00:00Z", end: null } }),
    });
    const result = await callToolHandler({
      params: {
        name: "addTimeEntry",
        arguments: { start: "2024-01-01T09:00:00Z" },
      },
    });
    const entry = JSON.parse(result.content[0].text);
    expect(entry.id).toBe("te3");
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.start).toBe("2024-01-01T09:00:00Z");
    expect(body.end).toBeUndefined();
  });

  it("throws if start is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: {
          name: "addTimeEntry",
          arguments: { description: "No start" },
        },
      }),
    ).rejects.toThrow("start is required");
  });

  it("throws if taskId is provided without projectId", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: {
          name: "addTimeEntry",
          arguments: { start: "2024-01-01T09:00:00Z", taskId: "task1" },
        },
      }),
    ).rejects.toThrow("projectId is required when taskId is provided");
  });
});

describe("updateTimeEntry", () => {
  it("fetches existing entry and PUTs with merged fields", async () => {
    mockUser();
    // GET existing
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "te5",
        description: "Old description",
        billable: false,
        tagIds: [],
        projectId: "p1",
        taskId: null,
        timeInterval: { start: "2024-01-01T09:00:00Z", end: "2024-01-01T10:00:00Z" },
      }),
    });
    // PUT update
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "te5", description: "New description" }),
    });
    const result = await callToolHandler({
      params: {
        name: "updateTimeEntry",
        arguments: {
          timeEntryId: "te5",
          description: "New description",
          billable: true,
        },
      },
    });
    const updated = JSON.parse(result.content[0].text);
    expect(updated.description).toBe("New description");
    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.description).toBe("New description");
    expect(body.billable).toBe(true);
    // start/end preserved from existing entry
    expect(body.start).toBe("2024-01-01T09:00:00Z");
  });

  it("throws if timeEntryId is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: { name: "updateTimeEntry", arguments: {} },
      }),
    ).rejects.toThrow("timeEntryId is required");
  });
});

describe("deleteTimeEntry", () => {
  it("calls DELETE and returns success", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const result = await callToolHandler({
      params: {
        name: "deleteTimeEntry",
        arguments: { timeEntryId: "te9" },
      },
    });
    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.deleted).toBe("te9");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("throws if timeEntryId is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: { name: "deleteTimeEntry", arguments: {} },
      }),
    ).rejects.toThrow("timeEntryId is required");
  });
});

describe("listUsers", () => {
  it("returns users from workspace", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob" },
      ],
    });
    const result = await callToolHandler({
      params: { name: "listUsers", arguments: {} },
    });
    const users = JSON.parse(result.content[0].text);
    expect(users.length).toBe(2);
    expect(users[0].name).toBe("Alice");
  });

  it("passes name, email, status filters", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await callToolHandler({
      params: {
        name: "listUsers",
        arguments: { name: "Alice", status: "ACTIVE" },
      },
    });
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("name=Alice");
    expect(callUrl).toContain("status=ACTIVE");
  });
});

describe("getUserTimeEntries", () => {
  it("returns entries for a given user", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "te1", description: "Worked on Project" }],
    });
    const result = await callToolHandler({
      params: {
        name: "getUserTimeEntries",
        arguments: { userId: "u1", start: "2024-01-01", end: "2024-01-31" },
      },
    });
    const entries = JSON.parse(result.content[0].text);
    expect(entries[0].description).toBe("Worked on Project");
  });

  it("throws if userId is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: { name: "getUserTimeEntries", arguments: {} },
      }),
    ).rejects.toThrow("userId is required");
  });
});

describe("getSummaryReport", () => {
  it("calls the reports API (not the main API) with correct body shape", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totals: [{ totalTime: 3600 }],
        groupOne: [],
      }),
    });
    const result = await callToolHandler({
      params: {
        name: "getSummaryReport",
        arguments: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
          userIds: ["u1", "u2"],
          projectIds: ["p1"],
        },
      },
    });
    const summary = JSON.parse(result.content[0].text);
    expect(summary.totals[0].totalTime).toBe(3600);

    // Verify it hit the reports subdomain
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("reports.api.clockify.me");
    expect(callUrl).toContain("/reports/summary");

    // Verify correct body shape per Clockify docs
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.dateRangeStart).toBe("2024-01-01T00:00:00Z");
    expect(body.dateRangeEnd).toBe("2024-01-31T23:59:59Z");
    expect(body.summaryFilter.groups).toEqual(["USER", "PROJECT"]);
    expect(body.users.ids).toEqual(["u1", "u2"]);
    expect(body.projects.ids).toEqual(["p1"]);
    // Should NOT have top-level 'groups' key (old incorrect shape)
    expect(body.groups).toBeUndefined();
  });

  it("defaults to USER, PROJECT grouping when groups not specified", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totals: [] }),
    });
    await callToolHandler({
      params: {
        name: "getSummaryReport",
        arguments: { start: "2024-01-01T00:00:00Z", end: "2024-01-31T23:59:59Z" },
      },
    });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.summaryFilter.groups).toEqual(["USER", "PROJECT"]);
  });

  it("accepts custom groups", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totals: [] }),
    });
    await callToolHandler({
      params: {
        name: "getSummaryReport",
        arguments: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
          groups: ["PROJECT", "CLIENT"],
        },
      },
    });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.summaryFilter.groups).toEqual(["PROJECT", "CLIENT"]);
  });

  it("throws if start or end is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: {
          name: "getSummaryReport",
          arguments: { start: "2024-01-01T00:00:00Z" },
        },
      }),
    ).rejects.toThrow("start and end are required");
  });
});

describe("getDetailedReport", () => {
  it("calls the reports API detailed endpoint", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totals: [{ totalTime: 7200 }],
        timeentries: [],
      }),
    });
    const result = await callToolHandler({
      params: {
        name: "getDetailedReport",
        arguments: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
      },
    });
    const report = JSON.parse(result.content[0].text);
    expect(report.totals[0].totalTime).toBe(7200);

    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("reports.api.clockify.me");
    expect(callUrl).toContain("/reports/detailed");

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.dateRangeStart).toBe("2024-01-01T00:00:00Z");
    expect(body.dateRangeEnd).toBe("2024-01-31T23:59:59Z");
    expect(body.detailedFilter).toBeDefined();
  });

  it("caps pageSize at 1000", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totals: [], timeentries: [] }),
    });
    await callToolHandler({
      params: {
        name: "getDetailedReport",
        arguments: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
          pageSize: 9999,
        },
      },
    });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.detailedFilter.pageSize).toBe(1000);
  });
});

describe("getUserTimeEntriesByName", () => {
  it("finds a user by partial name and returns their entries", async () => {
    mockUser();
    // listUsers call
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "u1", name: "Inaki Anduaga" },
        { id: "u2", name: "Bob Smith" },
      ],
    });
    // time entries call
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "te1", description: "Worked on Project" }],
    });
    const result = await callToolHandler({
      params: {
        name: "getUserTimeEntriesByName",
        arguments: {
          userName: "inaki",
          start: "2024-04-01",
          end: "2024-04-30",
        },
      },
    });
    const entries = JSON.parse(result.content[0].text);
    expect(entries[0].description).toBe("Worked on Project");
    // Verify the time entries URL uses the matched user ID
    const timeEntriesUrl = fetchMock.mock.calls[2][0];
    expect(timeEntriesUrl).toContain("/user/u1/time-entries");
  });

  it("throws if no user found", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "u2", name: "Bob Smith" }],
    });
    await expect(
      callToolHandler({
        params: {
          name: "getUserTimeEntriesByName",
          arguments: { userName: "Nonexistent" },
        },
      }),
    ).rejects.toThrow("No user found matching name: Nonexistent");
  });

  it("throws if userName is missing", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: { name: "getUserTimeEntriesByName", arguments: {} },
      }),
    ).rejects.toThrow("userName is required");
  });
});

describe("listTags", () => {
  it("returns tags from workspace", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "tag1", name: "Design" },
        { id: "tag2", name: "Development" },
      ],
    });
    const result = await callToolHandler({
      params: { name: "listTags", arguments: {} },
    });
    const tags = JSON.parse(result.content[0].text);
    expect(tags.length).toBe(2);
    expect(tags[0].name).toBe("Design");
  });

  it("passes name filter", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await callToolHandler({
      params: { name: "listTags", arguments: { name: "Design" } },
    });
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("name=Design");
  });
});

describe("listClients", () => {
  it("returns clients from workspace", async () => {
    mockUser();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "c1", name: "Acme Corp" }],
    });
    const result = await callToolHandler({
      params: { name: "listClients", arguments: {} },
    });
    const clients = JSON.parse(result.content[0].text);
    expect(clients[0].name).toBe("Acme Corp");
    const callUrl = fetchMock.mock.calls[1][0];
    expect(callUrl).toContain("/clients");
  });
});

describe("error handling", () => {
  it("throws for unknown tool name", async () => {
    mockUser();
    await expect(
      callToolHandler({
        params: { name: "doesNotExist", arguments: {} },
      }),
    ).rejects.toThrow("Unknown tool: doesNotExist");
  });
});
