import os
import sys
from pathlib import Path
from decimal import Decimal
import uuid
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

backend_dir = Path("d:/FreshCart/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

TEST_DB_PATH = backend_dir / "test_freshcart_orders.db"
if TEST_DB_PATH.exists():
    try:
        TEST_DB_PATH.unlink()
    except Exception:
        pass

test_engine = create_engine(
    f"sqlite:///{TEST_DB_PATH}",
    connect_args={"check_same_thread": False}
)

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

from app.models import Base, Product, Order, OrderItem
Base.metadata.create_all(bind=test_engine)

# Seed isolated test database with pristine baseline
from app.seed import seed_database
from app.database import get_db
from app.core.config import settings

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
db = TestingSessionLocal()
seed_database(db)

from fastapi.testclient import TestClient
from app.main import app

def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_SECRET_KEY}
INVALID_HEADERS = {"X-Admin-Key": "wrong-secret-demo-key"}

print("\n" + "=" * 75)
print("FRESHCART PHASE 05 — ORDER MANAGEMENT & DELIVERY TRACKING TEST SUITE")
print("(EXECUTING IN ISOLATED TEST DATABASE: test_freshcart_orders.db)")
print("=" * 75)

def get_sample_customer(name="Rajesh Sharma", email="rajesh.sharma@example.in", phone="9876543210", method="cod"):
    return {
        "customer_name": name,
        "customer_email": email,
        "customer_phone": phone,
        "delivery_address": "Flat 402, Green Glen Layout, Bellandur",
        "delivery_city": "Bengaluru",
        "delivery_state": "Karnataka",
        "delivery_pincode": "560103",
        "delivery_instructions": "Leave package with apartment security guard.",
        "payment_method": method,
        "items": [{"product_id": 1, "quantity": 2}],
        "idempotency_key": str(uuid.uuid4()),
    }

# -----------------------------------------------------------------------------
# TEST 1: Order Creation and Initial State Verification
# -----------------------------------------------------------------------------
print("\n[TEST 1] Order Creation & Baseline Delivery Fields:")
payload1 = get_sample_customer(name="Order One Customer", method="cod")
res1 = client.post("/api/orders/checkout", json=payload1)
assert res1.status_code == 201
data1 = res1.json()
ref1 = data1["order_reference"]
print(f"Created order: Ref={ref1}, status={data1['order_status']}, delivery_status={data1['delivery_status']}")
assert data1["order_status"] == "placed"
assert data1["delivery_status"] == "pending"
assert data1["payment_status"] == "pending"
print(">>> PASS: Order created with order_status='placed' and delivery_status='pending'.")

# -----------------------------------------------------------------------------
# TEST 2: Admin Access Control Enforcement (Unauthenticated vs Authenticated)
# -----------------------------------------------------------------------------
print("\n[TEST 2] Admin Access Control Enforcement (GET /api/orders & PATCH /api/orders/{ref}/status):")
# 2a. Unauthenticated GET /api/orders must return 401
res_unauth = client.get("/api/orders")
assert res_unauth.status_code == 401
assert "admin authentication required" in res_unauth.json()["detail"].lower()
print("  ✓ Unauthenticated GET /api/orders strictly rejected with HTTP 401.")

# 2b. Invalid Key GET /api/orders must return 401
res_invalid = client.get("/api/orders", headers=INVALID_HEADERS)
assert res_invalid.status_code == 401
assert "invalid admin authentication key" in res_invalid.json()["detail"].lower()
print("  ✓ Invalid credential GET /api/orders strictly rejected with HTTP 401.")

# 2c. Unauthenticated PATCH status must return 401
res_patch_unauth = client.patch(f"/api/orders/{ref1}/status", json={"order_status": "confirmed"})
assert res_patch_unauth.status_code == 401
print("  ✓ Unauthenticated PATCH /api/orders/{ref}/status strictly rejected with HTTP 401.")

# 2d. Authenticated GET /api/orders with valid X-Admin-Key succeeds
res_auth = client.get("/api/orders", headers=ADMIN_HEADERS)
assert res_auth.status_code == 200
assert len(res_auth.json()) >= 1
print("  ✓ Authenticated GET /api/orders succeeds with HTTP 200.")
print(">>> PASS: Admin access control correctly protects endpoints and rejects unauthorized calls.")

# -----------------------------------------------------------------------------
# TEST 3: Customer-Facing Order History Retrieval Proof-of-Possession
# -----------------------------------------------------------------------------
print("\n[TEST 3] Customer-Facing Order History Proof-of-Possession:")
# 3a. Customer single-order lookup (public receipt)
res_cust_detail = client.get(f"/api/orders/{ref1}")
assert res_cust_detail.status_code == 200
assert res_cust_detail.json()["order_reference"] == ref1
print("  ✓ Customer single order lookup GET /api/orders/{ref} is accessible without admin header.")

# 3b. Customer order history lookup endpoint with valid order references (public customer endpoint)
res_cust_history = client.post(
    "/api/orders/customer-history",
    json={"order_references": [ref1]}
)
assert res_cust_history.status_code == 200
history_data = res_cust_history.json()
assert len(history_data) == 1
assert history_data[0]["order_reference"] == ref1
print("  ✓ Valid order reference lookup POST /api/orders/customer-history returns only the customer's order.")

# 3c. Email-only lookup rejection (prevent customer order enumeration)
res_email_only = client.post(
    "/api/orders/customer-history",
    json={"customer_email": "priya.patel@example.com"}
)
assert res_email_only.status_code == 422
print("  ✓ Email-only lookup strictly rejected with HTTP 422 (cannot enumerate orders by email).")

# 3d. Phone-only lookup rejection (prevent customer order enumeration)
res_phone_only = client.post(
    "/api/orders/customer-history",
    json={"customer_phone": "9876543210"}
)
assert res_phone_only.status_code == 422
print("  ✓ Phone-only lookup strictly rejected with HTTP 422 (cannot enumerate orders by phone).")

# 3e. Empty order references rejection
res_empty_refs = client.post(
    "/api/orders/customer-history",
    json={"order_references": []}
)
assert res_empty_refs.status_code == 422
print("  ✓ Empty order references lookup strictly rejected with HTTP 422.")
print(">>> PASS: Customer order history strictly requires valid order references; email/phone lookup rejected.")

# -----------------------------------------------------------------------------
# TEST 4: Admin Order Management List & Filters
# -----------------------------------------------------------------------------
print("\n[TEST 4] Admin Order Management List & Filters (Authenticated):")
payload2 = get_sample_customer(name="Priya Patel", email="priya.patel@example.com", phone="9123456780", method="cod")
res2 = client.post("/api/orders/checkout", json=payload2)
assert res2.status_code == 201
ref2 = res2.json()["order_reference"]

# 4a. List all orders with admin header
res_all = client.get("/api/orders", headers=ADMIN_HEADERS)
assert res_all.status_code == 200
orders_all = res_all.json()
assert len(orders_all) >= 2
assert any(o["order_reference"] == ref1 for o in orders_all)
assert any(o["order_reference"] == ref2 for o in orders_all)

# 4b. Filter by email
res_email = client.get(f"/api/orders?customer_email=priya.patel@example.com", headers=ADMIN_HEADERS)
assert res_email.status_code == 200
orders_email = res_email.json()
assert len(orders_email) == 1
assert orders_email[0]["order_reference"] == ref2
print(">>> PASS: Admin list and query filters function accurately with authentication.")

# -----------------------------------------------------------------------------
# TEST 5: Valid Lifecycle Progression: placed -> confirmed -> preparing -> out_for_delivery -> delivered
# -----------------------------------------------------------------------------
print("\n[TEST 5] Valid Lifecycle Progression Pipeline (Authenticated):")
# Step 1: placed -> confirmed
res_conf = client.patch(f"/api/orders/{ref1}/status", json={"order_status": "confirmed"}, headers=ADMIN_HEADERS)
assert res_conf.status_code == 200
data_conf = res_conf.json()
assert data_conf["order_status"] == "confirmed"
assert data_conf["delivery_status"] == "order_confirmed"
assert data_conf["confirmed_at"] is not None
assert data_conf["estimated_delivery_at"] is not None

# Step 2: confirmed -> preparing
res_prep = client.patch(f"/api/orders/{ref1}/status", json={"order_status": "preparing"}, headers=ADMIN_HEADERS)
assert res_prep.status_code == 200
data_prep = res_prep.json()
assert data_prep["order_status"] == "preparing"
assert data_prep["delivery_status"] == "packing_in_progress"
assert data_prep["preparing_at"] is not None

# Step 3: preparing -> out_for_delivery
res_out = client.patch(
    f"/api/orders/{ref1}/status",
    json={
        "order_status": "out_for_delivery",
        "delivery_partner_name": "Ramesh Kumar (FreshCart Express)",
        "delivery_partner_phone": "+91 99887 76655",
        "delivery_notes": "Out on electric delivery scooter.",
    },
    headers=ADMIN_HEADERS,
)
assert res_out.status_code == 200
data_out = res_out.json()
assert data_out["order_status"] == "out_for_delivery"
assert data_out["delivery_status"] == "out_for_delivery"
assert data_out["out_for_delivery_at"] is not None
assert data_out["delivery_partner_name"] == "Ramesh Kumar (FreshCart Express)"

# Step 4: out_for_delivery -> delivered
res_del = client.patch(f"/api/orders/{ref1}/status", json={"order_status": "delivered"}, headers=ADMIN_HEADERS)
assert res_del.status_code == 200
data_del = res_del.json()
assert data_del["order_status"] == "delivered"
assert data_del["delivery_status"] == "delivered"
assert data_del["delivered_at"] is not None
assert data_del["payment_status"] == "paid"
print(">>> PASS: Valid lifecycle progression pipeline succeeded with milestone persistence.")

# -----------------------------------------------------------------------------
# TEST 6: Rejection of Invalid Status Transition: placed -> delivered (Skipping Steps)
# -----------------------------------------------------------------------------
print("\n[TEST 6] Invalid Transition Rejection (placed -> delivered):")
payload6 = get_sample_customer(name="Skip Test Customer")
res6 = client.post("/api/orders/checkout", json=payload6)
assert res6.status_code == 201
ref6 = res6.json()["order_reference"]

res_skip = client.patch(f"/api/orders/{ref6}/status", json={"order_status": "delivered"}, headers=ADMIN_HEADERS)
assert res_skip.status_code == 400
assert "invalid status transition from 'placed' to 'delivered'" in res_skip.json()["detail"].lower()
print(">>> PASS: Direct skip from 'placed' to 'delivered' strictly rejected with HTTP 400.")

# -----------------------------------------------------------------------------
# TEST 7: Rejection of Backward Transition: delivered -> preparing
# -----------------------------------------------------------------------------
print("\n[TEST 7] Terminal State Transition Rejection (delivered -> preparing):")
res_back = client.patch(f"/api/orders/{ref1}/status", json={"order_status": "preparing"}, headers=ADMIN_HEADERS)
assert res_back.status_code == 400
assert "invalid status transition from 'delivered' to 'preparing'" in res_back.json()["detail"].lower()
print(">>> PASS: Transitioning backwards from terminal 'delivered' state strictly rejected.")

# -----------------------------------------------------------------------------
# TEST 8: Rejection of Transition on Cancelled Order
# -----------------------------------------------------------------------------
print("\n[TEST 8] Cancelled Terminal State Protection:")
payload8 = get_sample_customer(name="Cancelled Order User")
res8 = client.post("/api/orders/checkout", json=payload8)
ref8 = res8.json()["order_reference"]

# Cancel order
res8_cancel = client.post(f"/api/orders/{ref8}/cancel")
assert res8_cancel.status_code == 200
assert res8_cancel.json()["order_status"] == "cancelled"

# Attempt to move cancelled order to confirmed
res8_revive = client.patch(f"/api/orders/{ref8}/status", json={"order_status": "confirmed"}, headers=ADMIN_HEADERS)
assert res8_revive.status_code == 400
assert "invalid status transition from 'cancelled' to 'confirmed'" in res8_revive.json()["detail"].lower()
print(">>> PASS: Moving a cancelled order to active states strictly rejected.")

# -----------------------------------------------------------------------------
# TEST 9: Inventory Restoration via Status Transition to Cancelled
# -----------------------------------------------------------------------------
print("\n[TEST 9] Inventory Restoration via Status Transition to Cancelled:")
p1 = db.query(Product).filter(Product.id == 1).first()
stock_before = p1.stock_quantity

payload9 = get_sample_customer(name="Admin Cancelled User")
res9 = client.post("/api/orders/checkout", json=payload9)
ref9 = res9.json()["order_reference"]

db.refresh(p1)
assert p1.stock_quantity == stock_before - 2

# Admin cancels via authenticated status endpoint
res9_admin_cancel = client.patch(f"/api/orders/{ref9}/status", json={"order_status": "cancelled"}, headers=ADMIN_HEADERS)
assert res9_admin_cancel.status_code == 200
assert res9_admin_cancel.json()["order_status"] == "cancelled"

db.refresh(p1)
assert p1.stock_quantity == stock_before
print(">>> PASS: Admin status cancellation restores product stock atomically.")

# -----------------------------------------------------------------------------
# TEST 10: Idempotent Status Update (Same Status Update Allowed)
# -----------------------------------------------------------------------------
print("\n[TEST 10] Idempotent Status Update:")
res_idem = client.patch(
    f"/api/orders/{ref1}/status",
    json={"order_status": "delivered", "delivery_notes": "Delivered and verified by resident."},
    headers=ADMIN_HEADERS,
)
assert res_idem.status_code == 200
assert res_idem.json()["order_status"] == "delivered"
print(">>> PASS: Idempotent update of same status updates notes without error.")

# -----------------------------------------------------------------------------
# TEST 11: Simulated Online Payment Flow & Delivery Status Integration
# -----------------------------------------------------------------------------
print("\n[TEST 11] Simulated Online Payment & Delivery State Synchronization:")
payload11 = get_sample_customer(name="Online Flow User", method="simulated_online")
res11 = client.post("/api/orders/checkout", json=payload11)
ref11 = res11.json()["order_reference"]

# Initial online order
assert res11.json()["order_status"] == "placed"
assert res11.json()["delivery_status"] == "pending"

# Simulate successful payment
res11_pay = client.post(f"/api/orders/{ref11}/pay", json={"scenario": "success"})
assert res11_pay.status_code == 200
data11_pay = res11_pay.json()
assert data11_pay["payment_status"] == "paid"
assert data11_pay["order_status"] == "confirmed"
assert data11_pay["order"]["delivery_status"] == "order_confirmed"
assert data11_pay["order"]["confirmed_at"] is not None
print(">>> PASS: Online payment success automatically promotes order_status='confirmed' and delivery_status='order_confirmed'.")

print("\n" + "=" * 75)
print("ALL 11 PHASE 05 ORDER MANAGEMENT & DELIVERY TRACKING TESTS PASSED!")
print("=" * 75)

db.close()
app.dependency_overrides.clear()
test_engine.dispose()
if TEST_DB_PATH.exists():
    try:
        TEST_DB_PATH.unlink()
    except Exception:
        pass
