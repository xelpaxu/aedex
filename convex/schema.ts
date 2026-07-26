import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
  reports: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  assignments: defineTable({
    reportId: v.id("reports"),
    teamId: v.id("teams"),
    status: v.string(),
    assignedAt: v.number(),
  }),
  teams: defineTable({
    name: v.string(),
    region: v.string(),
    avatar: v.string(),
  }),
});
