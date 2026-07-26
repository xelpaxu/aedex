import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createAssignment = mutation({
  args: { reportId: v.id("reports"), teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignments", {
      reportId: args.reportId,
      teamId: args.teamId,
      status: "Assigned",
      assignedAt: Date.now(),
    });
  },
});

export const addTeam = mutation({
  args: { name: v.string(), region: v.string(), avatar: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", { ...args });
  },
});

export const getAllTeams = query({
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

export const getActiveAssignments = query({
  handler: async (ctx) => {
    const assignments = await ctx.db.query("assignments").collect();

    // Map through assignments and attach the related data
    return await Promise.all(
      assignments.map(async (task) => {
        const team = await ctx.db.get(task.teamId);
        const report = await ctx.db.get(task.reportId);

        return {
          ...task,
          teamName: team?.name || "Unknown Team",
          teamAvatar: team?.avatar || "",
          region: team?.region || "Unknown Region",
          location: report?.locationName || "Unknown Location",
          reportStatus: report?.status || "PENDING",
        };
      }),
    );
  },
});

export const updateAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, { status: args.status });
  },
});
