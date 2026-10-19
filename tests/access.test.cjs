const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./backend-loader.cjs");
const { getFunctionName } = require("convex/server");
process.env.FIREBASE_PROJECT_ID = "test-pilot";
const users = load("users"),
  reports = load("reports"),
  assignments = load("assignments"),
  tanod = load("tanod"),
  access = load("access"),
  admins = load("admins");
const clerk = (subject = "officer") => ({
  subject,
  issuer: access.clerkIssuer(),
  tokenIdentifier: "clerk|" + subject,
  email: subject + "@example.test",
  name: subject,
});
const firebase = (subject = "admin") => ({
  subject,
  issuer: access.firebaseIssuer(),
  tokenIdentifier: "firebase|" + subject,
  email: subject + "@example.test",
});
class DB {
  constructor(seed = {}) {
    this.tables = structuredClone(seed);
    this.next = 100;
  }
  query(table) {
    let predicates = [],
      desc = false;
    const rows = () =>
      structuredClone(
        (this.tables[table] || [])
          .filter((r) => predicates.every((fn) => fn(r)))
          .sort((a, b) => (desc ? b._creationTime - a._creationTime : 0)),
      );
    const query = {
      withIndex: (_name, fn) => {
        if (fn) {
          const index = {
            eq: (field, value) => {
              predicates.push((row) => row[field] === value);
              return index;
            },
          };
          fn(index);
        }
        return query;
      },
      filter: (fn) => {
        const f = {
          field: (key) => (row) => row[key],
          eq: (a, b) => (row) =>
            (typeof a === "function" ? a(row) : a) ===
            (typeof b === "function" ? b(row) : b),
          and:
            (...values) =>
            (row) =>
              values.every((v) => v(row)),
        };
        predicates.push(fn(f));
        return query;
      },
      order: (value) => {
        desc = value === "desc";
        return query;
      },
      collect: async () => rows(),
      first: async () => rows()[0] || null,
      unique: async () => {
        const found = rows();
        if (found.length > 1) throw Error("not unique");
        return found[0] || null;
      },
      take: async (n) => rows().slice(0, n),
    };
    return query;
  }
  async get(id) {
    return structuredClone(
      Object.values(this.tables)
        .flat()
        .find((r) => r._id === id) || null,
    );
  }
  async insert(table, data) {
    const id = table + ":" + this.next++;
    (this.tables[table] ||= []).push({
      ...structuredClone(data),
      _id: id,
      _creationTime: Date.now(),
    });
    return id;
  }
  async patch(id, data) {
    const row = Object.values(this.tables)
      .flat()
      .find((r) => r._id === id);
    if (!row) throw Error("missing");
    Object.assign(row, structuredClone(data));
    for (const k in row) if (row[k] === undefined) delete row[k];
  }
  async delete(id) {
    for (const table in this.tables)
      this.tables[table] = this.tables[table].filter((r) => r._id !== id);
  }
}
const officer = {
  _id: "u1",
  _creationTime: 1,
  clerkUserId: "officer",
  email: "officer@example.test",
  fullName: "Officer One",
  role: "tanod",
  tanodStatus: "active",
  tanodManaged: true,
  teamId: "t1",
  barangay: "Calumpang",
  assignedBarangay: "Calumpang",
  profileComplete: true,
};
const citizen = {
  _id: "u2",
  _creationTime: 1,
  clerkUserId: "citizen",
  role: "citizen",
  barangay: "San Juan",
  fullName: "Resident One",
  profileComplete: true,
};
const site = {
  _id: "r1",
  _creationTime: 1,
  clerkUserId: "citizen",
  userId: "citizen",
  userName: "Resident",
  description: "Water",
  imageUri: "image",
  locationName: "Canal",
  lat: 10,
  lng: 122,
  status: "Pending",
  verified: true,
  public: false,
  barangay: "Calumpang",
};
function setup(identity = clerk(), overrides = {}) {
  const db = new DB({
    users: [officer, citizen],
    teams: [
      {
        _id: "t1",
        _creationTime: 1,
        name: "Team One",
        barangay: "Calumpang",
        region: "Molo",
        avatar: "T",
      },
      {
        _id: "t2",
        _creationTime: 1,
        name: "Team Two",
        barangay: "San Juan",
        region: "Molo",
        avatar: "T",
      },
    ],
    reports: [site, { ...site, _id: "r2", barangay: "San Juan" }],
    assignments: [
      {
        _id: "a1",
        _creationTime: 1,
        reportId: "r1",
        teamId: "t1",
        status: "Assigned",
        assignedAt: 1,
      },
      {
        _id: "a2",
        _creationTime: 1,
        reportId: "r2",
        teamId: "t2",
        status: "Assigned",
        assignedAt: 1,
      },
    ],
    adminAccess: [
      {
        _id: "admin1",
        _creationTime: 1,
        uid: "admin",
        email: "admin@example.test",
        role: "lgu-admin",
        active: true,
      },
    ],
    ...overrides,
  });
  const ctx = { db, auth: { getUserIdentity: async () => identity } };
  const invoke = async (ref, args) => {
    const [module, name] = getFunctionName(ref).split(":");
    return load(module)[name]._handler(ctx, args);
  };
  ctx.runMutation = invoke;
  ctx.runQuery = invoke;
  return ctx;
}
const call = (fn, ctx, args = {}) => fn._handler(ctx, args);
const reportArgs = {
  userId: "forged",
  userName: "Forged",
  clerkUserId: "forged",
  barangay: "South Fundidor",
  description: "Water",
  imageUri: "image",
  locationName: "Canal",
  lat: 10,
  lng: 122,
  status: "Pending",
};
test("public account setup cannot inherit a Tanod role from an email match", async () => {
  const ctx = setup(clerk("new"), {
    users: [{ ...officer, clerkUserId: undefined, email: "new@example.test" }],
  });
  const id = await call(users.ensureMobileProfile, ctx);
  assert.equal((await ctx.db.get(id)).role, "citizen");
  assert.equal((await ctx.db.get(id)).clerkUserId, "new");
});
test("profile save cannot change role or official team", async () => {
  const ctx = setup(clerk("citizen"));
  await call(users.updateProfile, ctx, {
    firstName: "Resident",
    lastName: "One",
    phone: "",
    barangay: "South Fundidor",
    role: "tanod",
    teamId: "t1",
  });
  const user = await ctx.db.get("u2");
  assert.equal(user.role, "citizen");
  assert.equal(user.teamId, undefined);
  assert.equal(user.barangay, "South Fundidor");
});
test("only the three pilot barangays are accepted", async () => {
  for (const barangay of ["", "Molo District", "La Paz"])
    await assert.rejects(
      call(users.updateProfile, setup(clerk("citizen")), {
        firstName: "A",
        lastName: "B",
        phone: "",
        barangay,
      }),
      /Choose/,
    );
});
test("report author and barangay come from the authenticated profile", async () => {
  const ctx = setup(clerk("citizen"));
  const id = await call(reports.createReport, ctx, reportArgs);
  const saved = await ctx.db.get(id);
  assert.equal(saved.barangay, "San Juan");
  assert.equal(saved.userId, "citizen");
  assert.equal(saved.clerkUserId, "citizen");
  assert.equal(saved.userName, "Resident One");
});
test("report creation fails when profile barangay is missing", async () => {
  const ctx = setup(clerk("citizen"), {
    users: [{ ...citizen, barangay: "" }],
  });
  await assert.rejects(call(reports.createReport, ctx, reportArgs), /Choose/);
  assert.equal(ctx.db.tables.reports.length, 2);
});
test("changing reporting barangay preserves historic reports and official assignment", async () => {
  const ctx = setup();
  await call(users.updateProfile, ctx, {
    firstName: "Officer",
    lastName: "One",
    phone: "",
    barangay: "South Fundidor",
  });
  const u = await ctx.db.get("u1");
  assert.equal(u.assignedBarangay, "Calumpang");
  assert.equal(u.teamId, "t1");
  assert.equal((await ctx.db.get("r1")).barangay, "Calumpang");
});
test("email names and client profile roles cannot grant web administrator access", async () => {
  const ctx = setup(firebase("lgu-new"), {
    users: [{ ...citizen, uid: "lgu-new", role: "lgu-admin" }],
  });
  assert.equal(await call(admins.getMe, ctx), null);
  await assert.rejects(call(tanod.list, ctx), /Administrator/);
});
test("a Clerk subject matching a Firebase admin UID is not a web admin", async () => {
  assert.equal(await call(admins.getMe, setup(clerk("admin"))), null);
});
test("community cannot list Tanods, create teams, or dispatch", async () => {
  const ctx = setup(clerk("citizen"));
  await assert.rejects(call(tanod.list, ctx), /Administrator/);
  await assert.rejects(
    call(assignments.addTeam, ctx, {
      name: "x",
      barangay: "San Juan",
      region: "x",
      avatar: "x",
    }),
    /Administrator/,
  );
  await assert.rejects(
    call(assignments.createAssignment, ctx, { reportId: "r1", teamId: "t1" }),
    /Administrator/,
  );
});
test("active officer sees only their assigned reports", async () => {
  const ctx = setup();
  assert.deepEqual(
    (await call(reports.getAssignedReports, ctx)).map((r) => r._id),
    ["r1"],
  );
  assert.deepEqual(
    (await call(assignments.getAssignmentsForTanod, ctx)).map((a) => a._id),
    ["a1"],
  );
});
test("suspended, revoked, unreviewed, and password-setup officers have no assignment access", async () => {
  for (const patch of [
    { tanodStatus: "suspended" },
    { tanodStatus: "revoked" },
    { tanodStatus: undefined },
    { tanodManaged: undefined },
    { mustChangePassword: true },
  ]) {
    const ctx = setup(clerk(), { users: [{ ...officer, ...patch }] });
    assert.deepEqual(await call(reports.getAssignedReports, ctx), []);
    assert.deepEqual(await call(assignments.getAssignmentsForTanod, ctx), []);
    await assert.rejects(
      call(reports.resolveReport, ctx, { reportId: "r1" }),
      /Active Tanod/,
    );
  }
});
test("officer cannot resolve another team report or assignment", async () => {
  const ctx = setup();
  await assert.rejects(
    call(reports.resolveReport, ctx, { reportId: "r2" }),
    /not assigned/,
  );
  await assert.rejects(
    call(assignments.resolveAssignment, ctx, {
      assignmentId: "a2",
      resolutionImage: "image",
    }),
    /not assigned/,
  );
});
test("resolution does not auto-resolve a nearby report assigned to another team", async () => {
  const ctx = setup();
  await call(reports.resolveReport, ctx, { reportId: "r1" });
  assert.equal((await ctx.db.get("r1")).status, "Resolved");
  assert.equal((await ctx.db.get("r2")).status, "Pending");
  assert.equal((await ctx.db.get("a2")).status, "Assigned");
});
test("LGU revocation takes effect for an existing officer session", async () => {
  const ctx = setup(firebase());
  await call(tanod.updateAccess, ctx, {
    userId: "u1",
    teamId: "t1",
    status: "revoked",
  });
  ctx.auth.getUserIdentity = async () => clerk();
  assert.deepEqual(await call(assignments.getAssignmentsForTanod, ctx), []);
  await assert.rejects(
    call(reports.resolveReport, ctx, { reportId: "r1" }),
    /Active Tanod/,
  );
});
test("barangay administrators cannot grant officer access or read other barangay private reports", async () => {
  const ctx = setup(firebase("brgy"), {
    adminAccess: [
      {
        _id: "ba",
        uid: "brgy",
        role: "brgy-sanjuan",
        barangay: "San Juan",
        active: true,
      },
    ],
  });
  await assert.rejects(
    call(tanod.updateAccess, ctx, {
      userId: "u1",
      teamId: "t1",
      status: "active",
    }),
    /Administrator/,
  );
  assert.equal(await call(reports.getReport, ctx, { id: "r1" }), null);
  await assert.rejects(
    call(assignments.getTeamById, ctx, { teamId: "t1" }),
    /Outside/,
  );
});
test("anonymous clients cannot read private reports or mutate officers", async () => {
  const ctx = setup(null);
  assert.equal(await call(reports.getReport, ctx, { id: "r1" }), null);
  await assert.rejects(
    call(tanod.updateAccess, ctx, {
      userId: "u1",
      teamId: "t1",
      status: "revoked",
    }),
    /Administrator/,
  );
});
test("LGU account creation reservation rejects duplicate emails and concurrent provisioning", async () => {
  const ctx = setup(firebase());
  await assert.rejects(
    call(tanod.reserve, ctx, { email: officer.email, teamId: "t1" }),
    /already/,
  );
  await call(tanod.reserve, ctx, { email: "new@example.test", teamId: "t1" });
  await assert.rejects(
    call(tanod.reserve, ctx, { email: "new@example.test", teamId: "t1" }),
    /progress/,
  );
});
test("provisioned officer must change password and cannot clear another account gate", async () => {
  const ctx = setup(firebase());
  const job = await call(tanod.reserve, ctx, {
    email: "new@example.test",
    teamId: "t1",
  });
  const id = await call(tanod.finish, ctx, {
    jobId: job.id,
    clerkUserId: "new",
    email: "new@example.test",
    firstName: "New",
    lastName: "Officer",
    teamId: "t1",
  });
  const u = await ctx.db.get(id);
  assert.equal(u.mustChangePassword, true);
  assert.equal(u.role, "tanod");
  assert.equal(u.assignedBarangay, "Calumpang");
  ctx.auth.getUserIdentity = async () => clerk();
  await assert.rejects(
    call(tanod.markPassword, ctx, {
      userId: id,
      version: u.passwordVersion,
      required: false,
    }),
    /Access changed/,
  );
});
test("password-change completion rejects a stale reset version", async () => {
  const ctx = setup(clerk(), {
    users: [{ ...officer, mustChangePassword: true, passwordVersion: 5 }],
  });
  await assert.rejects(
    call(tanod.markPassword, ctx, {
      userId: "u1",
      version: 4,
      required: false,
    }),
    /Access changed/,
  );
  assert.equal((await ctx.db.get("u1")).mustChangePassword, true);
});
test('authenticated LGU provisioning creates a managed officer without storing the temporary password', async()=>{
 const originalFetch=global.fetch,oldKey=process.env.CLERK_SECRET_KEY;process.env.CLERK_SECRET_KEY='test-only-key';
 const ctx=setup(firebase());let suppliedPassword;
 global.fetch=async(url,options)=>{if(options.method==='GET')return new Response(JSON.stringify([]));const body=JSON.parse(options.body);suppliedPassword=body.password;assert.equal(body.skip_password_checks,undefined);return new Response(JSON.stringify({id:'clerk-created'}));};
 try {const result=await call(load('tanodActions').createAccount,ctx,{email:'new@example.test',firstName:'New',lastName:'Officer',teamId:'t1'});assert.equal(result.temporaryPassword,suppliedPassword);assert.ok(suppliedPassword.length>=32);const user=await ctx.db.get(result.userId);assert.equal(user.tanodManaged,true);assert.equal(user.mustChangePassword,true);assert.equal(user.clerkUserId,'clerk-created');assert.ok(!JSON.stringify(ctx.db.tables).includes(suppliedPassword));}
 finally{global.fetch=originalFetch;if(oldKey===undefined)delete process.env.CLERK_SECRET_KEY;else process.env.CLERK_SECRET_KEY=oldKey;}
});
test('non-admin provisioning is rejected before contacting Clerk',async()=>{
 const originalFetch=global.fetch,oldKey=process.env.CLERK_SECRET_KEY;process.env.CLERK_SECRET_KEY='test-only-key';let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected network')};
 try{await assert.rejects(call(load('tanodActions').createAccount,setup(clerk('citizen')),{email:'new@example.test',firstName:'New',lastName:'Officer',teamId:'t1'}),/Administrator/);assert.equal(calls,0)}finally{global.fetch=originalFetch;if(oldKey===undefined)delete process.env.CLERK_SECRET_KEY;else process.env.CLERK_SECRET_KEY=oldKey;}
});
test('password setup verifies the old credential before clearing the first-login gate',async()=>{
 const originalFetch=global.fetch,oldKey=process.env.CLERK_SECRET_KEY;process.env.CLERK_SECRET_KEY='test-only-key';const ctx=setup(clerk(),{users:[{...officer,mustChangePassword:true,passwordVersion:8}]});let valid=false,updates=0;
 global.fetch=async(url,options)=>{if(url.endsWith('/verify_password'))return new Response(JSON.stringify({verified:valid}));updates++;return new Response(JSON.stringify({id:'officer'}));};
 try{const args={currentPassword:'temporary',newPassword:'a-new-password-123!'};await assert.rejects(call(load('tanodActions').changeInitialPassword,ctx,args),/Incorrect/);assert.equal(updates,0);assert.equal((await ctx.db.get('u1')).mustChangePassword,true);valid=true;await call(load('tanodActions').changeInitialPassword,ctx,args);assert.equal(updates,1);assert.equal((await ctx.db.get('u1')).mustChangePassword,false)}finally{global.fetch=originalFetch;if(oldKey===undefined)delete process.env.CLERK_SECRET_KEY;else process.env.CLERK_SECRET_KEY=oldKey;}
});
test('legacy duplicate assignments do not allow an officer to operate another team assignment',async()=>{
 const ctx=setup();ctx.db.tables.assignments.push({_id:'foreign',_creationTime:1,reportId:'r1',teamId:'t2',status:'Assigned',assignedAt:1});
 await assert.rejects(call(assignments.resolveAssignment,ctx,{assignmentId:'foreign',resolutionImage:'image'}),/another team/);
 await call(reports.resolveReport,ctx,{reportId:'r1'});assert.equal((await ctx.db.get('foreign')).status,'Assigned');
});
