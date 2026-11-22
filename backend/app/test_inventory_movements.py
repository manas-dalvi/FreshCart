"""
FreshCart Phase 07D Inventory Movement History Verification Suite
Tests:
1. Inventory movement recorded on successful checkout (stock_out)
2. Inventory movement recorded on customer cancellation (stock_in)
3. Inventory movement recorded on admin order cancellation (stock_in)
4. Inventory movement recorded on admin manual stock adjustment (adjustment)
5. Paginated movement list with limit and offset
6. Filter movements by product_id
7. Filter movements by movement_type (stock_in, stock_out, adjustment)
8. Search movements by keyword
9. Input validation on invalid movement type (HTTP 400)
10. Admin security enforcement (HTTP 401 on unauthenticated access)
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.database import SessionLocal
from app.models.product import Product
from app.models.inventory_movement import InventoryMovement

client = TestClient(app)
ADMIN_KEY = settings.ADMIN_SECRET_KEY

def test_admin_security_enforcement():
    # Unauthenticated
    res = client.get("/api/inventory/movements")
    assert res.status_code == 401, f"Expected 401 without key, got {res.status_code}"

    # Invalid admin key
    res_bad = client.get("/api/inventory/movements", headers={"X-Admin-Key": "invalid-secret"})
    assert res_bad.status_code == 401, f"Expected 401 with wrong key, got {res_bad.status_code}"

    # Valid key
    res_ok = client.get("/api/inventory/movements", headers={"X-Admin-Key": ADMIN_KEY})
    assert res_ok.status_code == 200, f"Expected 200 with valid key, got {res_ok.status_code}"
    print("PASS: test_admin_security_enforcement")

def test_input_validation_invalid_movement_type():
    res = client.get(
        "/api/inventory/movements?movement_type=invalid_type",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res.status_code == 400
    assert "Invalid movement_type" in res.json()["detail"]
    print("PASS: test_input_validation_invalid_movement_type")

def test_admin_stock_adjustment_movement():
    db = SessionLocal()
    # Use Product 5 (Fresh Spinach) for adjustment test
    p = db.query(Product).filter(Product.id == 5).first()
    original_stock = p.stock_quantity
    db.close()

    # Step 1: Adjust stock +10
    new_qty = original_stock + 10
    res = client.patch(
        "/api/products/5/stock",
        headers={"X-Admin-Key": ADMIN_KEY},
        json={"stock_quantity": new_qty, "reason": "Restock shipment from local farm"},
    )
    assert res.status_code == 200
    assert res.json()["stock_quantity"] == new_qty

    # Step 2: Verify movement ledger recorded adjustment
    res_mov = client.get(
        "/api/inventory/movements?product_id=5&movement_type=adjustment",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_mov.status_code == 200
    data = res_mov.json()
    assert data["total"] >= 1
    latest = data["items"][0]
    assert latest["product_id"] == 5
    assert latest["movement_type"] == "adjustment"
    assert latest["quantity_changed"] == 10
    assert latest["previous_stock"] == original_stock
    assert latest["new_stock"] == new_qty
    assert "Restock shipment from local farm" in latest["reason"]
    assert latest["admin_user"] == "admin"

    # Step 3: Revert stock back to original
    res_revert = client.patch(
        "/api/products/5/stock",
        headers={"X-Admin-Key": ADMIN_KEY},
        json={"stock_quantity": original_stock, "reason": "Test tear-down reset"},
    )
    assert res_revert.status_code == 200
    assert res_revert.json()["stock_quantity"] == original_stock
    print("PASS: test_admin_stock_adjustment_movement")

def test_checkout_stock_out_movement():
    db = SessionLocal()
    p = db.query(Product).filter(Product.id == 6).first()
    p6_stock_before = p.stock_quantity
    db.close()

    # Place test order for Product 6 (qty 2)
    order_payload = {
        "customer_name": "Ledger Audit User",
        "customer_email": "audit.ledger@freshcart.com",
        "customer_phone": "9876543210",
        "delivery_address": "404 Ledger Way, Financial District",
        "delivery_city": "Mumbai",
        "delivery_state": "Maharashtra",
        "delivery_pincode": "400001",
        "payment_method": "cod",
        "items": [{"product_id": 6, "quantity": 2}],
    }
    res_order = client.post("/api/orders/checkout", json=order_payload)
    assert res_order.status_code == 201, f"Order failed: {res_order.text}"
    order_data = res_order.json()
    order_ref = order_data["order_reference"]
    order_id = order_data["id"]

    # Verify inventory movement recorded stock_out
    res_mov = client.get(
        f"/api/inventory/movements?product_id=6&movement_type=stock_out",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_mov.status_code == 200
    data = res_mov.json()
    assert data["total"] >= 1
    latest = data["items"][0]
    assert latest["product_id"] == 6
    assert latest["movement_type"] == "stock_out"
    assert latest["quantity_changed"] == -2
    assert latest["previous_stock"] == p6_stock_before
    assert latest["new_stock"] == p6_stock_before - 2
    assert latest["order_id"] == order_id
    assert order_ref in latest["reason"]
    assert "Ledger Audit User" in latest["admin_user"]

    print("PASS: test_checkout_stock_out_movement")
    return order_ref, p6_stock_before

def test_order_cancellation_stock_in_movement():
    # Use order placed in previous test to test customer cancellation
    order_ref, original_p6_stock = test_checkout_stock_out_movement()

    # Cancel the order
    res_cancel = client.post(f"/api/orders/{order_ref}/cancel")
    assert res_cancel.status_code == 200, f"Cancel failed: {res_cancel.text}"

    # Verify inventory movement recorded stock_in
    res_mov = client.get(
        f"/api/inventory/movements?product_id=6&movement_type=stock_in",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_mov.status_code == 200
    data = res_mov.json()
    assert data["total"] >= 1
    latest = data["items"][0]
    assert latest["product_id"] == 6
    assert latest["movement_type"] == "stock_in"
    assert latest["quantity_changed"] == 2
    assert latest["new_stock"] == original_p6_stock
    assert order_ref in latest["reason"]
    assert "Customer Cancellation" in latest["admin_user"]

    # Verify product stock is back to original
    db = SessionLocal()
    p6 = db.query(Product).filter(Product.id == 6).first()
    assert p6.stock_quantity == original_p6_stock
    db.close()

    print("PASS: test_order_cancellation_stock_in_movement")

def test_admin_order_cancellation_movement():
    db = SessionLocal()
    p7 = db.query(Product).filter(Product.id == 7).first()
    p7_stock_before = p7.stock_quantity
    db.close()

    # Place order
    order_payload = {
        "customer_name": "Admin Cancel User",
        "customer_email": "admin.cancel@freshcart.com",
        "customer_phone": "9876543210",
        "delivery_address": "777 Admin Blvd",
        "delivery_city": "Pune",
        "delivery_state": "Maharashtra",
        "delivery_pincode": "411001",
        "payment_method": "cod",
        "items": [{"product_id": 7, "quantity": 1}],
    }
    res_order = client.post("/api/orders/checkout", json=order_payload)
    assert res_order.status_code == 201, f"Order failed: {res_order.text}"
    order_ref = res_order.json()["order_reference"]

    # Admin changes status to cancelled
    res_admin_cancel = client.patch(
        f"/api/orders/{order_ref}/status",
        headers={"X-Admin-Key": ADMIN_KEY},
        json={"order_status": "cancelled", "delivery_notes": "Cancelled by store manager"},
    )
    assert res_admin_cancel.status_code == 200

    # Verify movement recorded stock_in with admin reference
    res_mov = client.get(
        f"/api/inventory/movements?product_id=7&movement_type=stock_in",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_mov.status_code == 200
    data = res_mov.json()
    latest = data["items"][0]
    assert latest["movement_type"] == "stock_in"
    assert latest["quantity_changed"] == 1
    assert latest["admin_user"] == "admin"
    assert "Admin cancellation restock" in latest["reason"]

    # Verify stock restored
    db = SessionLocal()
    p7_now = db.query(Product).filter(Product.id == 7).first()
    assert p7_now.stock_quantity == p7_stock_before
    db.close()

    print("PASS: test_admin_order_cancellation_movement")

def test_movement_pagination_and_search():
    # Test pagination
    res_p1 = client.get(
        "/api/inventory/movements?limit=2&offset=0",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert len(data_p1["items"]) <= 2
    assert data_p1["limit"] == 2
    assert data_p1["offset"] == 0

    # Test search by product name
    res_search = client.get(
        "/api/inventory/movements?search=Spinach",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_search.status_code == 200
    data_search = res_search.json()
    for item in data_search["items"]:
        assert "Spinach" in item["product_name"] or "Spinach" in item["reason"]

    print("PASS: test_movement_pagination_and_search")

if __name__ == "__main__":
    test_admin_security_enforcement()
    test_input_validation_invalid_movement_type()
    test_admin_stock_adjustment_movement()
    test_checkout_stock_out_movement()
    test_order_cancellation_stock_in_movement()
    test_admin_order_cancellation_movement()
    test_movement_pagination_and_search()
    print("\nALL INVENTORY MOVEMENT TESTS PASSED SUCCESSFULLY!")
