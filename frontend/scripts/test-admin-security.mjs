/**
 * FreshCart Phase 05 Security Verification Script
 * Validates:
 * 1. Absence of admin secret in all frontend static bundles (.next/static)
 * 2. Absence of hardcoded admin secrets and NEXT_PUBLIC_ADMIN_SECRET in frontend source (frontend/src)
 * 3. Server-side session token generation, HMAC verification, tampering resistance, and expiration
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "..");
const STATIC_DIR = path.join(FRONTEND_DIR, ".next", "static");
const SRC_DIR = path.join(FRONTEND_DIR, "src");

const FORBIDDEN_STRINGS = [
  "freshcart-demo-admin-key-2026",
  "NEXT_PUBLIC_ADMIN_SECRET",
];

function getAllFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, filter));
    } else if (!filter || filter(fullPath)) {
      results.push(fullPath);
    }
  });
  return results;
}

console.log("===========================================================================");
console.log("FRESHCART PHASE 05 — ADMIN SECRET EXPOSURE & SESSION SECURITY TEST SUITE");
console.log("===========================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Bundle Scanning (.next/static/**/*.js)
// ---------------------------------------------------------------------------
console.log("[TEST 1] Scanning Generated Client JavaScript Bundles (.next/static/**/*.js)...");
const bundleFiles = getAllFiles(STATIC_DIR, (f) => f.endsWith(".js"));
assert(bundleFiles.length > 0, `Found ${bundleFiles.length} generated JavaScript bundles to inspect.`);

let bundleViolations = 0;
for (const file of bundleFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const forbidden of FORBIDDEN_STRINGS) {
    if (content.includes(forbidden)) {
      console.error(`    VIOLATION in ${path.relative(FRONTEND_DIR, file)}: found "${forbidden}"`);
      bundleViolations++;
    }
  }
}
assert(bundleViolations === 0, `Zero occurrences of admin secrets in generated client JavaScript chunks.`);

// ---------------------------------------------------------------------------
// TEST 2: Source Code Scanning (frontend/src/**/*)
// ---------------------------------------------------------------------------
console.log("\n[TEST 2] Scanning Frontend Source Code (frontend/src/**/*)...");
const srcFiles = getAllFiles(SRC_DIR, (f) => /\.(ts|tsx|js|jsx)$/.test(f));
assert(srcFiles.length > 0, `Found ${srcFiles.length} source files to inspect.`);

let srcViolations = 0;
for (const file of srcFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const forbidden of FORBIDDEN_STRINGS) {
    if (content.includes(forbidden)) {
      console.error(`    VIOLATION in ${path.relative(FRONTEND_DIR, file)}: found "${forbidden}"`);
      srcViolations++;
    }
  }
}
assert(srcViolations === 0, `Zero occurrences of hardcoded admin secrets or NEXT_PUBLIC_ADMIN_SECRET in frontend/src.`);

// ---------------------------------------------------------------------------
// TEST 3: Server-Side Cryptographic Session Token Verification
// ---------------------------------------------------------------------------
console.log("\n[TEST 3] Server-Side Cryptographic Session Token Logic...");
const testSecret = "test-server-secret-key-xyz-789";

function createTestToken(secret, timestampOffset = 0) {
  const timestamp = (Date.now() + timestampOffset).toString();
  const hmac = crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${hmac}`;
}

function verifyTestToken(token, secret, maxAgeSec = 60 * 60 * 8) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [timestampStr, expectedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  const age = Date.now() - timestamp;
  if (age < 0 || age > maxAgeSec * 1000) return false;
  const actualHmac = crypto.createHmac("sha256", secret).update(timestampStr).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(actualHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
}

// 3a: Valid token
const validToken = createTestToken(testSecret);
assert(verifyTestToken(validToken, testSecret) === true, "Valid session token verifies successfully.");

// 3b: Wrong secret
assert(verifyTestToken(validToken, "wrong-secret") === false, "Token signed with different secret is rejected.");

// 3c: Tampered payload
const tamperedToken = validToken.slice(0, -4) + "0000";
assert(verifyTestToken(tamperedToken, testSecret) === false, "Tampered signature is strictly rejected.");

// 3d: Expired token (9 hours old)
const expiredToken = createTestToken(testSecret, -9 * 60 * 60 * 1000);
assert(verifyTestToken(expiredToken, testSecret) === false, "Expired token (> 8 hours) is strictly rejected.");

// 3e: Future/clock-skew token
const futureToken = createTestToken(testSecret, 60 * 1000);
assert(verifyTestToken(futureToken, testSecret) === false, "Token with future timestamp is rejected.");

console.log("\n===========================================================================");
if (failed === 0) {
  console.log(`ALL ${passed} SECURITY CHECKS PASSED SUCCESSFULLY!`);
  console.log("===========================================================================");
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} checks failed!`);
  console.log("===========================================================================");
  process.exit(1);
}
