const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { load } = require("./backend-loader.cjs");
const access = load("access");
let reports = load("reports");
if (process.env.AEDEX_REPORTS_SOURCE) {
  const filename = path.resolve(__dirname, "../../convex/reports.ts");
  const staged = new Module(filename, module);
  staged.filename = filename;
  staged.paths = Module._nodeModulePaths(path.dirname(filename));
  staged._compile(
    ts.transpileModule(
      fs.readFileSync(process.env.AEDEX_REPORTS_SOURCE, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    filename,
  );
  reports = staged.exports;
}
const officer = {
  _id: "u1",
  clerkUserId: "officer",
  role: "tanod",
  tanodManaged: true,
  tanodStatus: "active",
  teamId: "mine",
  barangay: "Calumpang",
  assignedBarangay: "Calumpang",
};
function context(user = officer) {
  const rows = {
    users: user ? [user] : [],
    teams: [
      { _id: "mine", name: "My patrol", barangay: "Calumpang" },
      { _id: "other", name: "Other patrol", barangay: "Calumpang" },
      { _id: "outside", name: "Outside patrol", barangay: "San Juan" },
    ],
    reports: [
      { _id: "r1", barangay: "Calumpang" },
      { _id: "r2", barangay: "Calumpang" },
      { _id: "r3", barangay: "San Juan" },
      { _id: "mismatch", barangay: "San Juan" },
    ],
    assignments: [
      {
        _id: "a1",
        teamId: "mine",
        reportId: "r1",
        assignedAt: 1,
        status: "Assigned",
      },
      {
        _id: "a2",
        teamId: "other",
        reportId: "r2",
        assignedAt: 3,
        status: "In Progress",
      },
      {
        _id: "a3",
        teamId: "outside",
        reportId: "r3",
        assignedAt: 4,
        status: "Assigned",
      },
      {
        _id: "a4",
        teamId: "other",
        reportId: "mismatch",
        assignedAt: 5,
        status: "Assigned",
      },
      {
        _id: "deleted",
        teamId: "other",
        reportId: "missing",
        assignedAt: 6,
        status: "Assigned",
      },
    ],
  };
  return {
    auth: {
      getUserIdentity: async () =>
        user ? { subject: "officer", issuer: access.clerkIssuer() } : null,
    },
    db: {
      get: async (id) =>
        Object.values(rows)
          .flat()
          .find((r) => r._id === id) || null,
      query(table) {
        let result = rows[table] || [];
        const q = {
          withIndex(_name, fn) {
            const ix = {
              eq(key, value) {
                result = result.filter((r) => r[key] === value);
                return ix;
              },
            };
            fn(ix);
            return q;
          },
          collect: async () => result,
          unique: async () => result[0] || null,
          first: async () => result[0] || null,
        };
        return q;
      },
    },
  };
}
test("default query keeps own-team assignments and includes ownership metadata", async () => {
  const rows = await reports.getAssignedReports._handler(context(), {});
  assert.deepEqual(
    rows.map((r) => r.assignmentId),
    ["a1"],
  );
  assert.equal(rows[0].isMine, true);
  assert.equal(rows[0].teamName, "My patrol");
});
test("barangay view includes other teams but excludes outside, mismatched and deleted reports", async () => {
  const rows = await reports.getAssignedReports._handler(context(), {
    scope: "barangay",
  });
  assert.deepEqual(
    rows.map((r) => r.assignmentId),
    ["a2", "a1"],
  );
  assert.equal(rows[0].isMine, false);
  assert.equal(rows[0].teamName, "Other patrol");
});
test("anonymous, citizen and suspended users cannot browse assignments", async () => {
  for (const user of [
    null,
    { ...officer, role: "citizen" },
    { ...officer, tanodStatus: "suspended" },
    { ...officer, mustChangePassword: true },
  ])
    assert.deepEqual(
      await reports.getAssignedReports._handler(context(user), {
        scope: "barangay",
      }),
      [],
    );
});
test("viewing another team report does not allow resolving it", async () => {
  const ctx = context();
  await reports.getAssignedReports._handler(ctx, { scope: "barangay" });
  await assert.rejects(
    access.requireReportOperator(ctx, "r2"),
    /not assigned to your team/,
  );
});
require("./backend-loader.cjs");
const { filterReports, reportCounts } = require("../lib/tanodReports.ts");
const sample = [
  {
    assignmentId: "resolved",
    status: "CRITICAL",
    assignmentStatus: "Completed",
    assignedAt: 5,
    locationName: "Canal",
    teamName: "Patrol A",
  },
  {
    assignmentId: "active",
    status: "Pending",
    assignmentStatus: "Assigned",
    assignedAt: 4,
    locationName: "Market",
    teamName: "Patrol B",
  },
  {
    assignmentId: "critical",
    status: "Pending",
    riskLevel: "HIGH RISK",
    assignmentStatus: "Assigned",
    assignedAt: 1,
    locationName: "School",
    teamName: "Patrol A",
  },
];
test("queue prioritizes unresolved critical sites and uses assignment completion", () => {
  assert.deepEqual(
    filterReports(sample, "all").map((r) => r.assignmentId),
    ["critical", "active", "resolved"],
  );
  assert.deepEqual(reportCounts(sample), {
    all: 3,
    active: 2,
    critical: 1,
    resolved: 1,
  });
});
test("team and location searches combine with the status filter", () => {
  assert.deepEqual(
    filterReports(sample, "active", "Patrol A").map((r) => r.assignmentId),
    ["critical"],
  );
  assert.equal(filterReports(sample, "resolved", "Market").length, 0);
  assert.equal(filterReports(sample, "active", " school ").length, 1);
});
