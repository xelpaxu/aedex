import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ─────────────────────────────────────────────
   ROLE TYPE
───────────────────────────────────────────── */

export type Role =
  | "lgu-admin"
  | "brgy-calumpang"
  | "brgy-sanjuan"
  | "brgy-southfundidor"
  | "sys-admin";

/* ─────────────────────────────────────────────
   HARDCODED USERS (demo accounts)
───────────────────────────────────────────── */

interface HardcodedUser {
  id: string;
  username: string;
  password: string;
  role: Role;
  displayName: string;
  location: string;
}

const USERS: HardcodedUser[] = [
  {
    id: "user-lgu-admin",
    username: "lgu.admin",
    password: "admin123",
    role: "lgu-admin",
    displayName: "LGU Admin",
    location: "Molo District, Iloilo City",
  },
  {
    id: "user-brgy-calumpang",
    username: "brgy.calumpang",
    password: "admin123",
    role: "brgy-calumpang",
    displayName: "Barangay Admin",
    location: "Calumpang, Molo",
  },
  {
    id: "user-brgy-sanjuan",
    username: "brgy.sanjuan",
    password: "admin123",
    role: "brgy-sanjuan",
    displayName: "Barangay Admin",
    location: "San Juan, Molo",
  },
  {
    id: "user-brgy-southfundidor",
    username: "brgy.southfundidor",
    password: "admin123",
    role: "brgy-southfundidor",
    displayName: "Barangay Admin",
    location: "South Fundidor, Molo",
  },
  {
    id: "user-sys-admin",
    username: "sys.admin",
    password: "admin123",
    role: "sys-admin",
    displayName: "System Admin",
    location: "Global Root Access",
  },
];

/* ─────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────── */

export const login = query({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (_ctx, { username, password }) => {
    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) return null;

    const { password: _pw, ...safeUser } = user;
    return safeUser;
  },
});

/* ─────────────────────────────────────────────
   GET USER BY ROLE (FIXES YOUR ERROR)
───────────────────────────────────────────── */

export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    if (!user) return null;

    return {
      id: user._id,
      name: user.name,           // schema field
      tokenIdentifier: user.tokenIdentifier,
      // username, role, displayName, location are NOT in your schema
    };
  },
});

export const getByRole = query({
  args: {
    role: v.string(),
  },
  handler: async (_ctx, { role }) => {
    const user = USERS.find((u) => u.role === role);

    if (!user) return null;

    const { password: _pw, ...safeUser } = user;
    return safeUser;
  },
});

/* ─────────────────────────────────────────────
   LIST ALL ACCOUNTS (for UI buttons)
───────────────────────────────────────────── */

export const listAccounts = query({
  args: {},
  handler: async () => {
    return USERS.map(({ password: _pw, ...user }) => user);
  },
});

export const storeUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tokenIdentifier = identity.subject;
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();

    if (!existingUser) {
      await ctx.db.insert("users", {
        tokenIdentifier,
        name: identity.name ?? identity.email ?? "Anonymous",
      });
    }
  },
});