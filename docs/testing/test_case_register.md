# Test Case Register

**Project:** FreshCart — Online Grocery Application  
**Traceability:** Mapped to 6 Original User Stories (US-01 to US-06) and Cross-Cutting System/Admin Requirements  
**Status Legend:** PASS | FAIL | NOT EXECUTED  

---

## 1. Manual Testing Execution Summary

| Total Test Cases | PASS | FAIL | NOT EXECUTED | Execution Rate | Pass Rate (of Executed) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **18** | **13** | **0** | **5** | **72.2% (13/18)** | **100.0% (13/13)** |

---

## 2. Authoritative Test Cases & Execution Register

| Test ID | Story / Domain ID | Test Scenario & Description | Steps to Execute | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **US-01** | **Product search and category filtering** | 1. Enter keyword (e.g. "Mango") in search bar.<br>2. Click category filter pill (e.g. "Dairy & Eggs"). | Matching products display in real-time; catalogue filters accurately by category. | Verified: Search bar displays matching products on debounced query; category pills filter grid accurately. | **PASS** |
| **TC-02** | **US-02** | **Add product to cart and update quantity** | 1. Click "Add to Cart" on a product card or active carousel dish.<br>2. Use '+' and '-' buttons in cart drawer. | Product added to drawer; item count and subtotal increment/decrement accurately. | Verified: Item added with immediate subtotal recalculation; quantity increments and decrements work correctly. | **PASS** |
| **TC-03** | **US-02** | **Cart persistence after refresh/navigation** | 1. Add items to cart.<br>2. Reload page or navigate to another route and return. | Cart items, quantities, and calculated totals persist across reloads. | Pending execution in scheduled browser session. | **NOT EXECUTED** |
| **TC-04** | **US-03** | **Valid checkout and COD order placement** | 1. Complete checkout form with valid shipping details.<br>2. Select "Cash on Delivery" and submit. | Order placed successfully; unique reference generated; stock decremented in database. | Verified: COD order created with status `placed`, reference `FC-XXXXXXXX`, stock decremented by purchased count. | **PASS** |
| **TC-05** | **US-04** | **Successful simulated online payment on first attempt** | 1. Complete checkout selecting "Simulated Online Payment".<br>2. Trigger payment success scenario on first attempt. | Payment succeeds; status updates to `paid` and order marked `confirmed`; cart cleared. | Manual execution pending upcoming test cycle. | **NOT EXECUTED** |
| **TC-06** | **US-05** | **Admin order lifecycle update and customer tracking** | 1. Admin updates order status via console (`placed` → `confirmed` → `preparing` → `out_for_delivery` → `delivered`).<br>2. Customer checks tracking stepper. | Status progression updates accurately with timestamp milestones; customer view reflects changes. | Verified: Admin patch updates milestones with timestamps; customer tracking reflects updated milestone. | **PASS** |
| **TC-07** | **Cross-Cutting (Admin Inventory Management)** | **Admin stock adjustment and inventory movement ledger** | 1. Admin adjusts product stock level (±) in inventory view.<br>2. Check inventory movements ledger. | Stock level updates in catalogue; audit ledger logs `adjustment` with before/after counts and user attribution. | Verified: Stock count adjusts in database; movement ledger logs transition and reason. | **PASS** |
| **TC-08** | **US-03** | **Checkout with missing required details** | 1. Leave mandatory shipping fields (name, address, phone) blank.<br>2. Click submit order. | Form blocks submission; clear inline validation flags identify missing required fields. | Verified: Empty form submission blocked with inline field validation alerts. | **PASS** |
| **TC-09** | **US-03** | **Invalid mobile number** | 1. Enter an invalid phone number (e.g. "12345" or non-digit string).<br>2. Attempt to proceed with checkout. | System flags validation error requiring valid 10-digit mobile number; submission prevented. | Manual execution pending upcoming test cycle. | **NOT EXECUTED** |
| **TC-10** | **US-03** | **Checkout when stock is insufficient** | 1. Attempt checkout when requested quantity exceeds available warehouse stock. | Server rejects checkout with HTTP 400; inventory remains untouched; user notified. | Verified: Checkout with excessive quantity rejected with HTTP 400; 0 inventory modification. | **PASS** |
| **TC-11** | **Cross-Cutting (Admin Security & RBAC)** | **Unauthorized access to protected admin pages** | 1. Attempt navigating to `/admin/orders` without active admin session or valid secret key. | Route blocks access and redirects to admin login; administrative endpoints reject unauthenticated queries with HTTP 401. | Verified: Unauthorized access blocked; protected overview and orders data never fetched before authentication. | **PASS** |
| **TC-12** | **Cross-Cutting (Admin Security & RBAC)** | **Invalid admin credentials and unauthorized API request** | 1. Submit invalid secret key in admin login modal or send invalid `X-Admin-Key` header via API. | Request strictly rejected with HTTP 401 Unauthorized; invalid credential notification displayed. | Manual execution pending upcoming test cycle. | **NOT EXECUTED** |
| **TC-13** | **US-02** | **Quantity above available stock is rejected** | 1. Add item to cart.<br>2. Attempt to increase quantity beyond available warehouse inventory. | UI alerts user and caps quantity at maximum available stock; server validation flags `is_valid=False`. | Verified: Quantity capped at available inventory; alert informs user of stock limit. | **PASS** |
| **TC-14** | **US-02** | **Quantity equal to available stock is accepted** | 1. Add item with quantity exactly equal to available warehouse stock.<br>2. Validate cart payload. | System accepts order quantity; flags item as available with zero stock remaining. | Manual execution pending upcoming test cycle. | **NOT EXECUTED** |
| **TC-15** | **US-04** | **Simulated online payment failure** | 1. Select simulated online payment and trigger payment failure scenario. | Payment marked `failed`; order marked `payment_failed`; cart items preserved for retry. | Verified: Payment failure response received; order set to `payment_failed`; cart preserved. | **PASS** |
| **TC-16** | **US-04** | **Retry failed simulated payment without second stock deduction** | 1. On a failed payment order, initiate payment retry with success scenario. | Order transitions to `paid` and `confirmed`; inventory is NOT decremented a second time. | Verified: Payment retry succeeds on same order reference without duplicate stock deduction. | **PASS** |
| **TC-17** | **US-04** | **Switch failed online payment to COD** | 1. On an order where online payment failed or is pending, call switch-to-cod endpoint. | Order payment method switches to `cod`; payment status remains `pending`; order remains valid. | Verified: Endpoint switches method to `cod` with status `placed` and preserves existing reserved items. | **PASS** |
| **TC-18** | **Cross-Cutting (Order Lifecycle & Inventory Integrity)** | **Order cancellation and inventory restocking** | 1. Customer initiates cancellation on eligible placed order.<br>2. Inspect product inventory in database. | Order status marked `cancelled`; deducted stock restored to warehouse inventory exactly once. | Verified: Order cancelled; reserved inventory returned to warehouse stock atomically. | **PASS** |

---

## 3. Traceability Breakdown

### A. Core User Story Requirements (14 Cases across US-01 to US-05)

* **US-01: Product Search (Sprint 1 — 3 SP)**
  * **TC-01:** Product search and category filtering (**PASS**)
  * *Subtotal:* 1 Case (1 PASS, 0 NOT EXECUTED)

* **US-02: Shopping Cart (Sprint 1 — 5 SP)**
  * **TC-02:** Add product to cart and update quantity (**PASS**)
  * **TC-03:** Cart persistence after refresh/navigation (**NOT EXECUTED**)
  * **TC-13:** Quantity above available stock is rejected (**PASS**)
  * **TC-14:** Quantity equal to available stock is accepted (**NOT EXECUTED**)
  * *Subtotal:* 4 Cases (2 PASS, 2 NOT EXECUTED)

* **US-03: Order Placement (Sprint 2 — 5 SP)**
  * **TC-04:** Valid checkout and COD order placement (**PASS**)
  * **TC-08:** Checkout with missing required details (**PASS**)
  * **TC-09:** Invalid mobile number (**NOT EXECUTED**)
  * **TC-10:** Checkout when stock is insufficient (**PASS**)
  * *Subtotal:* 4 Cases (3 PASS, 1 NOT EXECUTED)

* **US-04: Simulated Payment & COD (Sprint 2 — 8 SP)**
  * **TC-05:** Successful simulated online payment on first attempt (**NOT EXECUTED**)
  * **TC-15:** Simulated online payment failure (**PASS**)
  * **TC-16:** Retry failed simulated payment without second stock deduction (**PASS**)
  * **TC-17:** Switch failed online payment to COD (**PASS**)
  * *Subtotal:* 4 Cases (3 PASS, 1 NOT EXECUTED)

* **US-05: Delivery Updates (Sprint 3 — 5 SP)**
  * **TC-06:** Admin order lifecycle update and customer tracking (**PASS**)
  * *Subtotal:* 1 Case (1 PASS, 0 NOT EXECUTED)

* **US-06: Order History (Sprint 3 — 3 SP)**
  * *Note:* Pure order-history views (e.g. historical receipt lookups) were not included in this 18-case manual execution run.
  * *Subtotal:* 0 Cases

* **User Story Subtotal:** **14 Cases** (10 PASS, 4 NOT EXECUTED, 0 FAIL)

---

### B. Cross-Cutting System & Infrastructure Requirements (4 Cases)

* **Admin Inventory Management:**
  * **TC-07:** Admin stock adjustment and inventory movement ledger (**PASS**)
  * *Subtotal:* 1 Case (1 PASS, 0 NOT EXECUTED)

* **Admin Security & RBAC:**
  * **TC-11:** Unauthorized access to protected admin pages (**PASS**)
  * **TC-12:** Invalid admin credentials and unauthorized API request (**NOT EXECUTED**)
  * *Subtotal:* 2 Cases (1 PASS, 1 NOT EXECUTED)

* **Order Lifecycle & Inventory Integrity:**
  * **TC-18:** Order cancellation and inventory restocking (**PASS**)
  * *Subtotal:* 1 Case (1 PASS, 0 NOT EXECUTED)

* **Cross-Cutting Subtotal:** **4 Cases** (3 PASS, 1 NOT EXECUTED, 0 FAIL)

---

## 4. Reconciled Summary

| Category / Domain | Scope Mapping | Total Cases | PASS | FAIL | NOT EXECUTED |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **US-01** | Product Search (Sprint 1 — 3 SP) | 1 | 1 | 0 | 0 |
| **US-02** | Shopping Cart (Sprint 1 — 5 SP) | 4 | 2 | 0 | 2 |
| **US-03** | Order Placement (Sprint 2 — 5 SP) | 4 | 3 | 0 | 1 |
| **US-04** | Simulated Payment & COD (Sprint 2 — 8 SP) | 4 | 3 | 0 | 1 |
| **US-05** | Delivery Updates (Sprint 3 — 5 SP) | 1 | 1 | 0 | 0 |
| **US-06** | Order History (Sprint 3 — 3 SP) | 0 | 0 | 0 | 0 |
| **Core User Stories Subtotal** | **Original Scope (29 Committed SP)** | **14** | **10** | **0** | **4** |
| **Cross-Cutting: Admin Inventory** | Admin stock adjustments & audit ledger | 1 | 1 | 0 | 0 |
| **Cross-Cutting: Admin Security** | Admin route authentication & RBAC | 2 | 1 | 0 | 1 |
| **Cross-Cutting: Lifecycle Integrity**| Atomic cancellation & stock replenishment | 1 | 1 | 0 | 0 |
| **Cross-Cutting Subtotal** | **System Infrastructure & Integrity** | **4** | **3** | **0** | **1** |
| **Total Test Register** | **Complete Audited Scope** | **18** | **13** | **0** | **5** |

---

## 5. Additional Implementation Verification Notes

Beyond the 18 authoritative test cases in the register, the codebase implements and has verified the following exceptional handling scenarios:
* **Cancellation of Already-Paid Order Rejection:** In `backend/app/routers/orders.py` and `test_checkout_scenarios.py` (Test 17), attempting to cancel an order whose `payment_status` is `"paid"` is strictly rejected with `HTTP 400 Bad Request` (*"Paid orders cannot be self-cancelled. Please contact customer support for refund assistance."*). This is documented as an auxiliary edge-case safety verification without replacing the canonical `TC-18`.
* **Duplicate Restocking Guard:** Repeated cancellations on already-cancelled orders are strictly blocked with `HTTP 400` to prevent duplicate restocking.
