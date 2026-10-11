// scripts/create_clerk_users.js
const https = require("https");
const fs = require("fs");
const path = require("path");

// Load CLERK_SECRET_KEY from .env, .env.local, or process.env
function getSecretKey() {
  if (process.env.CLERK_SECRET_KEY) return process.env.CLERK_SECRET_KEY;
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const full = path.resolve(__dirname, "..", f);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, "utf8");
      const match = content.match(/CLERK_SECRET_KEY\s*=\s*([^\r\n]+)/);
      if (match && match[1]) return match[1].trim();
    }
  }
  return null;
}

const USERS = [
  { firstName: "Alfredo", lastName: "Tagudando", email: "alfredo.tagudando@gmail.com" },
  { firstName: "Ranel Clarence", lastName: "David", email: "ranel.david@gmail.com" },
  { firstName: "Paul Vincent", lastName: "Marqueses", email: "paul.marqueses@gmail.com" },
  { firstName: "Shane", lastName: "Monteverde", email: "shane.monteverde@gmail.com" },
  { firstName: "Renato", lastName: "Dela Torre", email: "renato.delatorre@gmail.com" },
  { firstName: "Nenita", lastName: "Donasco", email: "nenita.donasco@gmail.com" },
  { firstName: "Roger", lastName: "Donasco", email: "roger.donasco@gmail.com" },
  { firstName: "Mary Rose", lastName: "Rodriguez", email: "maryrose.rodriguez@gmail.com" },
  { firstName: "Mary Grace", lastName: "Rodriguez Arcenio", email: "marygrace.arcenio@gmail.com" },
  { firstName: "Stephine", lastName: "Perasol", email: "stephine.perasol@gmail.com" },
  { firstName: "Analyn", lastName: "Navaja", email: "analyn.navaja@gmail.com" },
  { firstName: "Jonalyn", lastName: "Juares", email: "jonalyn.juares@gmail.com" },
  { firstName: "Jho Leen Dah", lastName: "Gecole", email: "jholeendah.gecole@gmail.com" },
  { firstName: "Gerald", lastName: "Ganje", email: "gerald.ganje@gmail.com" },
  { firstName: "Lanz Edward", lastName: "Cabaylo", email: "lanz.cabaylo@gmail.com" },
  { firstName: "Rednine", lastName: "Bahin", email: "rednine.bahin@gmail.com" },
];

const UNIFORM_PASSWORD = "vecpro123";

function clerkRequest(endpoint, method, payload, secretKey) {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : "";
    const options = {
      hostname: "api.clerk.com",
      path: endpoint,
      method: method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    };
    if (postData) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error("ERROR: CLERK_SECRET_KEY is not set.");
    console.log("Please provide your Clerk Secret Key (starts with sk_test_...)");
    process.exit(1);
  }

  console.log(`Starting creation of ${USERS.length} pre-verified users...`);
  console.log(`Uniform Password: ${UNIFORM_PASSWORD}\n`);

  for (const u of USERS) {
    console.log(`Creating user: ${u.firstName} ${u.lastName} (${u.email})...`);

    // 1. Create user
    const createRes = await clerkRequest(
      "/v1/users",
      "POST",
      {
        first_name: u.firstName,
        last_name: u.lastName,
        email_address: [u.email],
        password: UNIFORM_PASSWORD,
        skip_password_checks: true,
        bypass_client_trust: true,
      },
      secretKey
    );

    if (createRes.status === 200 || createRes.status === 201) {
      const createdUser = createRes.body;
      const emailObj = (createdUser.email_addresses || [])[0];

      // 2. Mark email as verified if not already
      if (emailObj && emailObj.verification?.status !== "verified") {
        const verifyRes = await clerkRequest(
          `/v1/email_addresses/${emailObj.id}`,
          "PATCH",
          { verified: true },
          secretKey
        );
        if (verifyRes.status === 200) {
          console.log(`  -> User created and email marked VERIFIED: ${createdUser.id}`);
        } else {
          console.log(`  -> User created: ${createdUser.id} (verify status: ${verifyRes.status})`);
        }
      } else {
        console.log(`  -> User created: ${createdUser.id}`);
      }
    } else {
      console.warn(`  -> Failed (${createRes.status}):`, JSON.stringify(createRes.body?.errors || createRes.body));
    }
  }

  console.log("\nFinished user creation!");
}

main().catch(console.error);
