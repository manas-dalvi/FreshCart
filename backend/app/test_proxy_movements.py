import urllib.request
import urllib.error
import json
import sys

def main():
    print("=== 1. TESTING UNAUTHENTICATED REQUEST (No Cookie) ===")
    req_unauth = urllib.request.Request("http://localhost:3000/api/admin/inventory/movements")
    try:
        res = urllib.request.urlopen(req_unauth)
        print("UNEXPECTED: Got status", res.status)
        sys.exit(1)
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode())
        print(f"HTTP Status: {e.code} (Expected 401)")
        print(f"Response Body: {body}")
        assert e.code == 401, f"Expected 401, got {e.code}"
        assert "Admin authentication required" in body.get("detail", "")
        print("PASS: Unauthenticated request rejected with HTTP 401")

    print("\n=== 2. TESTING INVALID COOKIE REQUEST ===")
    req_bad = urllib.request.Request(
        "http://localhost:3000/api/admin/inventory/movements",
        headers={"Cookie": "freshcart_admin_session=invalid-session-token-xyz"}
    )
    try:
        res = urllib.request.urlopen(req_bad)
        print("UNEXPECTED: Got status", res.status)
        sys.exit(1)
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode())
        print(f"HTTP Status: {e.code} (Expected 401)")
        print(f"Response Body: {body}")
        assert e.code == 401, f"Expected 401, got {e.code}"
        print("PASS: Invalid session cookie rejected with HTTP 401")

    print("\n=== 3. LOGGING IN TO OBTAIN VALID SESSION COOKIE ===")
    login_payload = json.dumps({"passkey": "freshcart-demo-admin-key-2026"}).encode("utf-8")
    req_login = urllib.request.Request(
        "http://localhost:3000/api/admin/login",
        data=login_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_login) as resp:
        print(f"Login Status: {resp.status}")
        set_cookie = resp.headers.get("Set-Cookie", "")
        token = set_cookie.split("freshcart_admin_session=")[1].split(";")[0].strip()
        print(f"Obtained session token: {token[:16]}...")

    print("\n=== 4. TESTING AUTHENTICATED REQUEST (With Session Cookie) ===")
    req_auth = urllib.request.Request(
        "http://localhost:3000/api/admin/inventory/movements?limit=5",
        headers={"Cookie": f"freshcart_admin_session={token}"}
    )
    with urllib.request.urlopen(req_auth) as resp:
        print(f"Authenticated Status: {resp.status} (Expected 200)")
        data = json.loads(resp.read().decode())
        print(f"Total records in database: {data.get('total')}")
        print(f"Records returned in page: {len(data.get('items', []))}")
        assert resp.status == 200
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) <= 5
        sample = data["items"][0]
        print("Latest record:", {
            "id": sample.get("id"),
            "product_name": sample.get("product_name"),
            "type": sample.get("movement_type"),
            "qty_changed": sample.get("quantity_changed"),
            "transition": f"{sample.get('previous_stock')} -> {sample.get('new_stock')}",
            "reason": sample.get("reason"),
            "user": sample.get("admin_user")
        })
        print("PASS: Authenticated request returns movement ledger with HTTP 200")

    print("\n=== 5. TESTING FILTERED REQUEST (movement_type=adjustment) ===")
    req_adj = urllib.request.Request(
        "http://localhost:3000/api/admin/inventory/movements?movement_type=adjustment",
        headers={"Cookie": f"freshcart_admin_session={token}"}
    )
    with urllib.request.urlopen(req_adj) as resp:
        print(f"Adjustment filter status: {resp.status} (Expected 200)")
        data = json.loads(resp.read().decode())
        for item in data.get("items", []):
            assert item["movement_type"] == "adjustment", f"Expected adjustment, got {item['movement_type']}"
        print(f"PASS: Filter returned {len(data['items'])} adjustments out of {data['total']} total adjustments")

    print("\nALL PROXY ENDPOINT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
