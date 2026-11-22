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

TEST_DB_PATH = backend_dir / "test_freshcart_checkout.db"
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

from app.seed import seed_database
from app.database import get_db

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

print("=" * 70)
print("FRESHCART PHASE 04 — CHECKOUT & SIMULATED PAYMENT TEST SUITE")
print("(EXECUTING IN ISOLATED TEST DATABASE: test_freshcart_checkout.db)")
print("=" * 70)

# Helper to generate unique customer info
def get_sample_customer(name="Rohan Sharma", phone="9876543210", pincode="400001", method="cod", key=None):
    return {
        "customer_name": name,
        "customer_email": f"{name.lower().replace(' ', '')}@example.com",
        "customer_phone": phone,
        "delivery_address": "Flat 402, Green Heights, Powai",
        "delivery_city": "Mumbai",
        "delivery_state": "Maharashtra",
        "delivery_pincode": pincode,
        "delivery_instructions": "Leave package at security gate.",
        "payment_method": method,
        "items": [],
        "idempotency_key": key or str(uuid.uuid4()),
    }

# Ensure baseline products exist
p1 = db.query(Product).filter(Product.id == 1).first()
p2 = db.query(Product).filter(Product.id == 2).first()
assert p1 and p2, "Database products must be seeded!"

# -----------------------------------------------------------------------------
# TEST 1: Valid COD Order Placement
# -----------------------------------------------------------------------------
print("\n[TEST 1] Valid COD Order Placement:")
stock_before = p1.stock_quantity
payload1 = get_sample_customer(name="Aarav Mehta", method="cod")
payload1["items"] = [{"product_id": 1, "quantity": 2}]

res1 = client.post("/api/orders/checkout", json=payload1)
assert res1.status_code == 201, f"Failed placing COD order: {res1.text}"
order1 = res1.json()
print(f"Order Created: Reference={order1['order_reference']}, Total=₹{order1['total_amount']}, PaymentStatus={order1['payment_status']}")
assert order1["payment_method"] == "cod"
assert order1["payment_status"] == "pending"
assert order1["order_status"] == "placed"
assert len(order1["items"]) == 1
assert order1["items"][0]["quantity"] == 2

db.refresh(p1)
assert p1.stock_quantity == stock_before - 2, "Stock not deducted on COD placement!"
print(">>> PASS: Valid COD order placed, status='placed', payment='pending', stock deducted by 2.")

# -----------------------------------------------------------------------------
# TEST 2: Successful Simulated Online Payment
# -----------------------------------------------------------------------------
print("\n[TEST 2] Successful Simulated Online Payment:")
payload2 = get_sample_customer(name="Priya Patel", method="simulated_online")
payload2["items"] = [{"product_id": 2, "quantity": 1}]

res2 = client.post("/api/orders/checkout", json=payload2)
assert res2.status_code == 201
order2 = res2.json()
order_ref2 = order2["order_reference"]
assert order2["payment_status"] == "pending"

# Pay successfully
res_pay_success = client.post(f"/api/orders/{order_ref2}/pay", json={"scenario": "success"})
assert res_pay_success.status_code == 200
pay_data2 = res_pay_success.json()
print(f"Payment Success Response: success={pay_data2['success']}, PaymentStatus={pay_data2['payment_status']}")
assert pay_data2["success"] is True
assert pay_data2["payment_status"] == "paid"
assert pay_data2["order_status"] == "confirmed"
print(">>> PASS: Simulated online payment succeeded, order confirmed and marked as paid.")

# -----------------------------------------------------------------------------
# TEST 3: Failed Simulated Payment
# -----------------------------------------------------------------------------
print("\n[TEST 3] Failed Simulated Online Payment:")
payload3 = get_sample_customer(name="Vikram Verma", method="simulated_online")
payload3["items"] = [{"product_id": 2, "quantity": 1}]

res3 = client.post("/api/orders/checkout", json=payload3)
assert res3.status_code == 201
order3 = res3.json()
order_ref3 = order3["order_reference"]

# Trigger failure scenario
res_pay_fail = client.post(f"/api/orders/{order_ref3}/pay", json={"scenario": "failure"})
assert res_pay_fail.status_code == 200
pay_data3 = res_pay_fail.json()
print(f"Payment Failure Response: success={pay_data3['success']}, PaymentStatus={pay_data3['payment_status']}")
assert pay_data3["success"] is False
assert pay_data3["payment_status"] == "failed"
assert pay_data3["order_status"] == "payment_failed"
print(">>> PASS: Simulated online payment failure cleanly sets status='failed' without false confirmation.")

# -----------------------------------------------------------------------------
# TEST 4: Retry After Failed Payment
# -----------------------------------------------------------------------------
print("\n[TEST 4] Retry After Failed Payment:")
# Retry on the existing order3 that previously failed
res_retry = client.post(f"/api/orders/{order_ref3}/pay", json={"scenario": "success"})
assert res_retry.status_code == 200
retry_data = res_retry.json()
print(f"Payment Retry Response: success={retry_data['success']}, PaymentStatus={retry_data['payment_status']}")
assert retry_data["success"] is True
assert retry_data["payment_status"] == "paid"
assert retry_data["order_status"] == "confirmed"
print(">>> PASS: Failed payment retried successfully on same order reference without re-creating order.")

# -----------------------------------------------------------------------------
# TEST 5: Insufficient Stock During Checkout
# -----------------------------------------------------------------------------
print("\n[TEST 5] Insufficient Stock During Checkout:")
db.refresh(p1)
current_stock1 = p1.stock_quantity
payload5 = get_sample_customer(name="Excess User")
payload5["items"] = [{"product_id": 1, "quantity": current_stock1 + 50}]

res5 = client.post("/api/orders/checkout", json=payload5)
print(f"Insufficient stock status: {res5.status_code}, error: {res5.json()['detail']}")
assert res5.status_code == 400
assert "Insufficient stock" in res5.json()["detail"]
db.refresh(p1)
assert p1.stock_quantity == current_stock1, "Stock was modified despite validation failure!"
print(">>> PASS: Exceeding stock strictly rejected with HTTP 400 and zero inventory modification.")

# -----------------------------------------------------------------------------
# TEST 6: Out-of-Stock Product
# -----------------------------------------------------------------------------
print("\n[TEST 6] Out-of-Stock Product:")
# Temporarily set product to 0 stock
p_temp = db.query(Product).filter(Product.id == 3).first()
original_stock_p3 = p_temp.stock_quantity
p_temp.stock_quantity = 0
db.commit()

payload6 = get_sample_customer(name="Zero Stock Buyer")
payload6["items"] = [{"product_id": 3, "quantity": 1}]
res6 = client.post("/api/orders/checkout", json=payload6)
print(f"Out-of-stock status: {res6.status_code}, detail: {res6.json()['detail']}")
assert res6.status_code == 400
assert "out of stock" in res6.json()["detail"].lower()

# Restore stock
p_temp.stock_quantity = original_stock_p3
db.commit()
print(">>> PASS: Out-of-stock product completely blocks order creation.")

# -----------------------------------------------------------------------------
# TEST 7: Inactive or Missing Product
# -----------------------------------------------------------------------------
print("\n[TEST 7] Inactive or Missing Product Handling:")
payload7_missing = get_sample_customer()
payload7_missing["items"] = [{"product_id": 999999, "quantity": 1}]
res7_missing = client.post("/api/orders/checkout", json=payload7_missing)
assert res7_missing.status_code == 400
assert "does not exist in inventory" in res7_missing.json()["detail"]

# Test inactive product
p_temp.is_active = False
db.commit()
payload7_inactive = get_sample_customer()
payload7_inactive["items"] = [{"product_id": 3, "quantity": 1}]
res7_inactive = client.post("/api/orders/checkout", json=payload7_inactive)
assert res7_inactive.status_code == 400
assert "unavailable for purchase" in res7_inactive.json()["detail"]

# Restore
p_temp.is_active = True
db.commit()
print(">>> PASS: Missing and inactive products strictly rejected.")

# -----------------------------------------------------------------------------
# TEST 8: Invalid Customer Details Validation
# -----------------------------------------------------------------------------
print("\n[TEST 8] Invalid Customer Details Validation:")
# 8a: Invalid phone (9 digits)
payload8_phone = get_sample_customer(phone="12345")
payload8_phone["items"] = [{"product_id": 1, "quantity": 1}]
res8_phone = client.post("/api/orders/checkout", json=payload8_phone)
assert res8_phone.status_code == 422, "Invalid phone should trigger 422 validation error!"

# 8b: Invalid PIN code (5 digits)
payload8_pin = get_sample_customer(pincode="40001")
payload8_pin["items"] = [{"product_id": 1, "quantity": 1}]
res8_pin = client.post("/api/orders/checkout", json=payload8_pin)
assert res8_pin.status_code == 422, "Invalid PIN code should trigger 422 validation error!"

# 8c: Invalid email
payload8_email = get_sample_customer()
payload8_email["customer_email"] = "not-an-email"
payload8_email["items"] = [{"product_id": 1, "quantity": 1}]
res8_email = client.post("/api/orders/checkout", json=payload8_email)
assert res8_email.status_code == 422, "Invalid email should trigger 422 validation error!"
print(">>> PASS: Schema validation enforces valid Indian phone, 6-digit PIN, and email format.")

# -----------------------------------------------------------------------------
# TEST 9: Backend-Calculated Total vs Frontend Submitted
# -----------------------------------------------------------------------------
print("\n[TEST 9] Backend Database Pricing Authority:")
db.refresh(p1)
expected_unit_price = Decimal(str(p1.price))
expected_subtotal = (expected_unit_price * Decimal(2)).quantize(Decimal("0.01"))
expected_fee = Decimal("0.00") if expected_subtotal >= Decimal("500.00") else Decimal("40.00")
expected_total = expected_subtotal + expected_fee

payload9 = get_sample_customer(name="Price Tamper Test")
payload9["items"] = [{"product_id": 1, "quantity": 2}]
# Note that the payload cannot even submit client prices — only product_id & quantity!
res9 = client.post("/api/orders/checkout", json=payload9)
assert res9.status_code == 201
data9 = res9.json()
print(f"Backend Calculated: Subtotal=₹{data9['subtotal']}, DeliveryFee=₹{data9['delivery_fee']}, Total=₹{data9['total_amount']}")
assert Decimal(str(data9["subtotal"])) == expected_subtotal
assert Decimal(str(data9["total_amount"])) == expected_total
print(">>> PASS: Total amount is computed purely from database unit prices and delivery rules.")

# -----------------------------------------------------------------------------
# TEST 10: Database Persistence of Orders & Order Items
# -----------------------------------------------------------------------------
print("\n[TEST 10] Database Persistence of Orders & Order Items:")
saved_order = db.query(Order).filter(Order.order_reference == data9["order_reference"]).first()
assert saved_order is not None, "Order was not saved in SQLite!"
assert len(saved_order.items) == 1, "OrderItem was not saved in SQLite!"
saved_item = saved_order.items[0]
assert saved_item.product_name == p1.name
assert saved_item.unit_price == p1.price
print(f"Direct SQLite Inspection: Order ID={saved_order.id}, Ref={saved_order.order_reference}, Item='{saved_item.product_name}', FrozenPrice=₹{saved_item.unit_price}")
print(">>> PASS: Order and OrderItem records successfully committed to SQLite.")

# -----------------------------------------------------------------------------
# TEST 11: Inventory Deduction Exactly Once
# -----------------------------------------------------------------------------
print("\n[TEST 11] Inventory Deduction Exactly Once:")
db.refresh(p2)
stock_before_11 = p2.stock_quantity
payload11 = get_sample_customer(name="Deduction Test")
payload11["items"] = [{"product_id": 2, "quantity": 3}]

res11 = client.post("/api/orders/checkout", json=payload11)
assert res11.status_code == 201
db.refresh(p2)
print(f"Product 2 Stock Before: {stock_before_11} | After Order: {p2.stock_quantity} (Difference: {stock_before_11 - p2.stock_quantity})")
assert p2.stock_quantity == stock_before_11 - 3
print(">>> PASS: Stock quantity deducted by exactly the purchased quantity (3).")

# -----------------------------------------------------------------------------
# TEST 12: Duplicate Checkout Request / Idempotency
# -----------------------------------------------------------------------------
print("\n[TEST 12] Idempotency & Duplicate Prevention:")
db.refresh(p2)
stock_before_idem = p2.stock_quantity
idem_key = f"idem-key-{uuid.uuid4()}"

payload12 = get_sample_customer(name="Double Submit User", key=idem_key)
payload12["items"] = [{"product_id": 2, "quantity": 2}]

# First submission
res12_a = client.post("/api/orders/checkout", json=payload12)
assert res12_a.status_code == 201
order12_a = res12_a.json()

db.refresh(p2)
stock_after_first = p2.stock_quantity
assert stock_after_first == stock_before_idem - 2

# Immediate second submission with identical idempotency token
res12_b = client.post("/api/orders/checkout", json=payload12)
assert res12_b.status_code == 201
order12_b = res12_b.json()

# Assert same order reference returned and stock NOT deducted twice
assert order12_a["order_reference"] == order12_b["order_reference"], "Idempotent retry created a new reference!"
db.refresh(p2)
print(f"After retry: Stock={p2.stock_quantity} (Initial: {stock_before_idem}, After 1st: {stock_after_first})")
assert p2.stock_quantity == stock_after_first, "Stock was double-deducted on idempotent retry!"
print(">>> PASS: Idempotency token prevents duplicate orders and prevents double inventory deduction.")

# -----------------------------------------------------------------------------
# TEST 13: Transaction Rollback on Failure
# -----------------------------------------------------------------------------
print("\n[TEST 13] Transaction Rollback on Multi-Item Failure:")
db.refresh(p1)
db.refresh(p2)
p1_stock_initial = p1.stock_quantity
p2_stock_initial = p2.stock_quantity

# Cart has Item 1 (valid) and Item 2 (exceeding stock)
payload13 = get_sample_customer(name="Rollback Test")
payload13["items"] = [
    {"product_id": 1, "quantity": 1},
    {"product_id": 2, "quantity": p2_stock_initial + 999},  # will fail
]

res13 = client.post("/api/orders/checkout", json=payload13)
assert res13.status_code == 400
db.refresh(p1)
db.refresh(p2)
print(f"P1 Stock (initial={p1_stock_initial}, current={p1.stock_quantity})")
print(f"P2 Stock (initial={p2_stock_initial}, current={p2.stock_quantity})")
assert p1.stock_quantity == p1_stock_initial, "P1 stock was deducted before rollback!"
assert p2.stock_quantity == p2_stock_initial, "P2 stock was deducted before rollback!"
print(">>> PASS: Atomic rollback ensures no partial stock deduction when an order fails.")

# -----------------------------------------------------------------------------
# TEST 14: Payment Retry Does Not Deduct Inventory Again
# -----------------------------------------------------------------------------
print("\n[TEST 14] Payment Retry Does Not Deduct Inventory Again:")
db.refresh(p2)
p2_stock_start = p2.stock_quantity

payload14 = get_sample_customer(name="Multi Step Payment User", method="simulated_online")
payload14["items"] = [{"product_id": 2, "quantity": 1}]

# Place order
res14_order = client.post("/api/orders/checkout", json=payload14)
assert res14_order.status_code == 201
ref14 = res14_order.json()["order_reference"]

db.refresh(p2)
assert p2.stock_quantity == p2_stock_start - 1, "Initial deduction failed"
expected_stock_level = p2.stock_quantity

# 1. Fail payment
res14_fail = client.post(f"/api/orders/{ref14}/pay", json={"scenario": "failure"})
assert res14_fail.status_code == 200
db.refresh(p2)
assert p2.stock_quantity == expected_stock_level, "Stock altered during failed payment!"

# 2. Retry payment (Success)
res14_retry = client.post(f"/api/orders/{ref14}/pay", json={"scenario": "success"})
assert res14_retry.status_code == 200
db.refresh(p2)
assert p2.stock_quantity == expected_stock_level, "Stock deducted a second time during payment retry!"
print(f"Stock before payment: {expected_stock_level} | Stock after retry: {p2.stock_quantity}")
print(">>> PASS: Payment retry transitions status without re-decrementing inventory.")

# -----------------------------------------------------------------------------
# TEST 15: Cancellation of an Eligible Order & Exact Inventory Restoration
# -----------------------------------------------------------------------------
print("\n[TEST 15] Cancellation & Exact Inventory Restoration:")
db.refresh(p1)
p1_stock_before_15 = p1.stock_quantity

# Place an order that will be cancelled
payload15 = get_sample_customer(name="Cancellation Test User", method="cod")
payload15["items"] = [{"product_id": 1, "quantity": 3}]

res15_order = client.post("/api/orders/checkout", json=payload15)
assert res15_order.status_code == 201
ref15 = res15_order.json()["order_reference"]

db.refresh(p1)
print(f"P1 Stock before order: {p1_stock_before_15} | After order: {p1.stock_quantity}")
assert p1.stock_quantity == p1_stock_before_15 - 3, "Stock not deducted on order creation!"

# Cancel the order
res15_cancel = client.post(f"/api/orders/{ref15}/cancel")
assert res15_cancel.status_code == 200, f"Failed to cancel order: {res15_cancel.text}"
cancel_data = res15_cancel.json()
assert cancel_data["order_status"] == "cancelled"
assert cancel_data["payment_status"] == "cancelled"

db.refresh(p1)
print(f"P1 Stock after cancellation: {p1.stock_quantity}")
assert p1.stock_quantity == p1_stock_before_15, "Inventory was not restored on cancellation!"
print(">>> PASS: Order cancelled and deducted stock (3 units) restored exactly once.")

# -----------------------------------------------------------------------------
# TEST 16: Repeated Cancellation Rejection (Prevents Double Restocking)
# -----------------------------------------------------------------------------
print("\n[TEST 16] Repeated Cancellation Rejection:")
# Attempt to cancel the already cancelled order
res16_repeat = client.post(f"/api/orders/{ref15}/cancel")
assert res16_repeat.status_code == 400
assert "already cancelled" in res16_repeat.json()["detail"].lower()

db.refresh(p1)
print(f"P1 Stock after repeated cancel attempt: {p1.stock_quantity}")
assert p1.stock_quantity == p1_stock_before_15, "Inventory was double-restored on repeated cancellation!"
print(">>> PASS: Repeated cancellation rejected with HTTP 400; inventory is not double-restored.")

# -----------------------------------------------------------------------------
# TEST 17: Cancellation of Already-Paid Order Rejection
# -----------------------------------------------------------------------------
print("\n[TEST 17] Cancellation of Already-Paid Order Rejection:")
# Create and pay for an order
payload17 = get_sample_customer(name="Paid Order User", method="simulated_online")
payload17["items"] = [{"product_id": 1, "quantity": 1}]
res17_order = client.post("/api/orders/checkout", json=payload17)
assert res17_order.status_code == 201
ref17 = res17_order.json()["order_reference"]

# Complete payment
res17_pay = client.post(f"/api/orders/{ref17}/pay", json={"scenario": "success"})
assert res17_pay.status_code == 200
assert res17_pay.json()["payment_status"] == "paid"

# Attempt to cancel paid order
res17_cancel = client.post(f"/api/orders/{ref17}/cancel")
assert res17_cancel.status_code == 400
assert "paid orders cannot be self-cancelled" in res17_cancel.json()["detail"].lower()
print(">>> PASS: Cancellation of already-paid orders strictly rejected.")

print("\n" + "=" * 70)
print("ALL 17 PHASE 04 CHECKOUT, PAYMENT & CANCELLATION TESTS PASSED!")
print("=" * 70)

db.close()
app.dependency_overrides.clear()
test_engine.dispose()
if TEST_DB_PATH.exists():
    try:
        TEST_DB_PATH.unlink()
    except Exception:
        pass
