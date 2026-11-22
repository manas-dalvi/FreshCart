"""
FreshCart Phase 05 Security Verification Suite
Tests:
1. Absence of admin secret in client-side bundles (.next/static/**/*.js)
2. Absence of admin secret and NEXT_PUBLIC_ADMIN_SECRET in frontend source (frontend/src)
3. Backend direct admin access control (401 on unauthenticated/invalid, 200 on valid)
4. Customer-facing endpoints work without admin secrets
5. Customer history protection against enumeration
"""

import sys
import os
import glob
from pathlib import Path
from decimal import Decimal

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Use isolated test database
import uuid

DB_NAME = f"test_freshcart_security_{uuid.uuid4().hex[:6]}.db"
os.environ["DATABASE_URL"] = f"sqlite:///./{DB_NAME}"
os.environ["FRESHCART_ADMIN_SECRET"] = "isolated-test-admin-secret-2026"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db, ensure_order_schema
from app.seed import seed_database
from app.models.product import Product
from app.models.order import Order

TEST_DB_FILE = BACKEND_DIR / DB_NAME

test_engine = create_engine(
    f"sqlite:///./{DB_NAME}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)
ensure_order_schema(test_engine)

with TestingSessionLocal() as session:
    seed_database(session)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

REPO_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
STATIC_DIR = FRONTEND_DIR / ".next" / "static"
SRC_DIR = FRONTEND_DIR / "src"

FORBIDDEN_PATTERNS = [
    "freshcart-demo-admin-key-2026",
    "NEXT_PUBLIC_ADMIN_SECRET",
]

print("===========================================================================")
print("FRESHCART PHASE 05 — COMPREHENSIVE SECURITY VERIFICATION TEST SUITE")
print("===========================================================================\n")

# ---------------------------------------------------------------------------
# TEST 1: Bundle Scanning
# ---------------------------------------------------------------------------
print("[TEST 1] Client JavaScript Bundle Scan for Exposed Secrets:")
js_bundles = list(STATIC_DIR.glob("**/*.js"))
assert len(js_bundles) > 0, f"Expected JS bundles in {STATIC_DIR}, found none."

violations = []
for js_file in js_bundles:
    content = js_file.read_text(encoding="utf-8", errors="ignore")
    for pattern in FORBIDDEN_PATTERNS:
        if pattern in content:
            violations.append((js_file.name, pattern))

if violations:
    for f, p in violations:
        print(f"  ✗ FAIL: Found '{p}' in bundle '{f}'")
    sys.exit(1)
print(f"  ✓ Inspected {len(js_bundles)} client bundles. Found 0 secret exposures.")
print(">>> PASS: Admin secret is completely absent from client JavaScript bundles.")

# ---------------------------------------------------------------------------
# TEST 2: Frontend Source Code Scan
# ---------------------------------------------------------------------------
print("\n[TEST 2] Frontend Source Code Scan (frontend/src):")
src_files = list(SRC_DIR.glob("**/*.*"))
src_code_files = [f for f in src_files if f.suffix in [".ts", ".tsx", ".js", ".jsx"]]
assert len(src_code_files) > 0, "No source files found in frontend/src."

src_violations = []
for src_file in src_code_files:
    content = src_file.read_text(encoding="utf-8", errors="ignore")
    for pattern in FORBIDDEN_PATTERNS:
        if pattern in content:
            src_violations.append((src_file.name, pattern))

if src_violations:
    for f, p in src_violations:
        print(f"  ✗ FAIL: Found '{p}' in source file '{f}'")
    sys.exit(1)
print(f"  ✓ Inspected {len(src_code_files)} source files. Found 0 secret exposures.")
print(">>> PASS: No hardcoded fallback or NEXT_PUBLIC_ADMIN_SECRET in frontend source.")

# ---------------------------------------------------------------------------
# TEST 3: Backend Direct Admin Access Control Enforcement
# ---------------------------------------------------------------------------
print("\n[TEST 3] Backend Admin API Access Control Enforcement:")

# 3a. Missing header -> 401
res_missing = client.get("/api/orders")
assert res_missing.status_code == 401, f"Expected 401, got {res_missing.status_code}"
assert "Missing 'X-Admin-Key' header" in res_missing.json()["detail"]
print("  ✓ Unauthenticated GET /api/orders strictly rejected with HTTP 401.")

# 3b. Invalid header -> 401
res_invalid = client.get("/api/orders", headers={"X-Admin-Key": "wrong-secret-token"})
assert res_invalid.status_code == 401, f"Expected 401, got {res_invalid.status_code}"
assert "Invalid admin authentication key" in res_invalid.json()["detail"]
print("  ✓ Invalid admin key GET /api/orders strictly rejected with HTTP 401.")

# 3c. Unauthenticated status update -> 401
res_patch_unauth = client.patch(
    "/api/orders/FC-NONEXISTENT/status",
    json={"order_status": "confirmed"}
)
assert res_patch_unauth.status_code == 401, f"Expected 401, got {res_patch_unauth.status_code}"
print("  ✓ Unauthenticated PATCH /api/orders/{ref}/status strictly rejected with HTTP 401.")

# 3d. Valid header -> 200
res_valid = client.get(
    "/api/orders",
    headers={"X-Admin-Key": "isolated-test-admin-secret-2026"}
)
assert res_valid.status_code == 200, f"Expected 200, got {res_valid.status_code}"
assert isinstance(res_valid.json(), list)
print("  ✓ Authenticated GET /api/orders succeeds with HTTP 200.")
print(">>> PASS: Backend strictly enforces admin authentication via X-Admin-Key.")

# ---------------------------------------------------------------------------
# TEST 4: Customer-Facing Endpoints Function Without Admin Credentials
# ---------------------------------------------------------------------------
print("\n[TEST 4] Customer-Facing Endpoints Functionality (No Admin Secret Required):")

# 4a. Place customer order
checkout_payload = {
    "customer_name": "Test Customer",
    "customer_email": "customer@example.com",
    "customer_phone": "9876543210",
    "delivery_address": "123 Green Market Street",
    "delivery_city": "Mumbai",
    "delivery_state": "Maharashtra",
    "delivery_pincode": "400001",
    "payment_method": "simulated_online",
    "items": [{"product_id": 1, "quantity": 1}],
}
order_res = client.post("/api/orders/checkout", json=checkout_payload)
assert order_res.status_code == 201, f"Checkout failed: {order_res.text}"
order_data = order_res.json()
order_ref = order_data["order_reference"]
print(f"  ✓ Customer order placed successfully: {order_ref} (No admin key required).")

# 4b. Customer receipt lookup without admin key
receipt_res = client.get(f"/api/orders/{order_ref}")
assert receipt_res.status_code == 200, f"Receipt lookup failed: {receipt_res.text}"
assert receipt_res.json()["order_reference"] == order_ref
print(f"  ✓ Customer receipt retrieved successfully via GET /api/orders/{order_ref}.")

# 4c. Customer order history via order reference proof of possession
hist_res = client.post("/api/orders/customer-history", json={"order_references": [order_ref]})
assert hist_res.status_code == 200, f"History lookup failed: {hist_res.text}"
returned_orders = hist_res.json()
assert len(returned_orders) == 1
assert returned_orders[0]["order_reference"] == order_ref
print("  ✓ Customer order history retrieved successfully using order_references.")

# 4d. Rejection of email/phone customer enumeration
email_enum_res = client.post("/api/orders/customer-history", json={"customer_email": "customer@example.com"})
assert email_enum_res.status_code == 422, f"Expected 422, got {email_enum_res.status_code}"
phone_enum_res = client.post("/api/orders/customer-history", json={"customer_phone": "9876543210"})
assert phone_enum_res.status_code == 422, f"Expected 422, got {phone_enum_res.status_code}"
print("  ✓ Customer enumeration by email or phone strictly rejected with HTTP 422.")

# 4e. Payment simulation without admin key
pay_res = client.post(f"/api/orders/{order_ref}/pay", json={"scenario": "success"})
assert pay_res.status_code == 200, f"Payment failed: {pay_res.text}"
assert pay_res.json()["payment_status"] == "paid"
assert pay_res.json()["order_status"] == "confirmed"
print("  ✓ Customer payment simulation succeeds without admin credentials.")

# 4f. Admin update of order status via valid backend key
admin_update_res = client.patch(
    f"/api/orders/{order_ref}/status",
    json={"order_status": "preparing", "delivery_notes": "Packed freshly in cold storage"},
    headers={"X-Admin-Key": "isolated-test-admin-secret-2026"}
)
assert admin_update_res.status_code == 200, f"Admin update failed: {admin_update_res.text}"
assert admin_update_res.json()["order_status"] == "preparing"
print("  ✓ Authenticated admin status update succeeds with live milestone persistence.")

print(">>> PASS: Customer operations remain fully functional; admin operations protected.")

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
test_engine.dispose()
try:
    if TEST_DB_FILE.exists():
        TEST_DB_FILE.unlink()
except Exception:
    pass

print("\n===========================================================================")
print("ALL SECURITY VERIFICATION TESTS EXECUTED AND PASSED SUCCESSFULLY!")
print("===========================================================================")
