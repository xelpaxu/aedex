import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

export const processAndSaveReport = action({
  args: {
    image: v.string(),
    description: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationName: v.string(),
  },

  handler: async (ctx, args): Promise<Id<"reports">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // =========================
    // Convert Base64 → Blob
    // =========================
    const base64Data = args.image.replace(/^data:image\/\w+;base64,/, "");

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    const imageBlob = new Blob([bytes], { type: "image/jpeg" });

    formData.append("file", imageBlob, "image.jpg");
    formData.append("description", args.description);

    // =========================
    // CALL PYTHON BACKEND
    // =========================
    const response = await fetch(
      "https://automatically-unbefriended-misty.ngrok-free.dev/detect",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`AI Server Error: ${response.status}`);
    }

    const result = await response.json();

    const riskLevel =
      result.risk_level ??
      (result.risk_score > 75
        ? "CRITICAL"
        : result.risk_score > 50
          ? "HIGH RISK"
          : "LOW RISK");
    const riskScore = result.risk_score ?? 0;

    console.log("Risk Level:", riskLevel);
    console.log("Risk Score:", riskScore);

    // =========================
    // SAVE TO DATABASE
    // =========================
    return await ctx.runMutation(api.reports.createReport, {
      userId: identity.subject,
      userName: identity.name || "Anonymous",
      description: args.description,
      imageUri: args.image,

      processedImage: result.processed_image || "",

      reasoning: result.reasoning || "Analysis complete.",

      accuracy: `${result.risk_score ?? 0}%`,

      verified: result.verified ?? false,

      detections: result.detections || [],

      locationName: args.locationName,
      lat: args.lat,
      lng: args.lng,

      status: result.risk_level ?? "LOW RISK",
    });
  },
});
