import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. The Mutation used by your Action (analysis.ts)
export const createReport = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    description: v.string(),
    imageUri: v.string(),
    processedImage: v.string(),
    reasoning: v.string(),
    accuracy: v.string(),
    verified: v.boolean(),
    detections: v.array(v.string()),
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reports", args);
  },
});

// 2. Query for "My Reports" tab
export const getMyReports = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("reports")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// 3. Query for "Community" tab & Feed
export const getPublicReports = query({
  handler: async (ctx) => {
    // Returns all reports from newest to oldest
    return await ctx.db.query("reports").order("desc").collect();
  },
});

// 4. Query for the Results Page
export const getReportById = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAllReports = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reports").order("desc").collect();
  },
});

export const verifyReport = mutation({
  args: {
    id: v.id("reports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);

    if (!report) {
      throw new Error("Report not found");
    }

    await ctx.db.patch(args.id, {
      verified: true,
    });

    return args.id;
  },
});
