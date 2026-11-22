# Product Backlog & User Stories

**Project:** FreshCart — Online Grocery Application  
**Estimation Scale:** Fibonacci Story Points (1, 2, 3, 5, 8)  
**Total Committed Sprints:** 3 Sprints  
**Total Committed Story Points:** 29 Story Points  
**Status:** Baseline Active

---

## 1. Original Product Backlog (6 User Stories / 29 Story Points)

| Story ID | Sprint | User Story | Priority | Story Points | Implementation Note |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **US-01** | Sprint 1 | **Product Search**<br>*As a customer*, I want to search and browse groceries by keyword and category so that I can quickly find products. | High (Must Have) | 3 | Real-time debounced search, category filters, product catalogue browsing. |
| **US-02** | Sprint 1 | **Shopping Cart**<br>*As a customer*, I want to add items to my cart, update quantities, remove items, and see calculated subtotals and totals so that I can manage my purchase. | High (Must Have) | 5 | Itemized math, stock limit guards, persistent cart state across page reloads. |
| **US-03** | Sprint 2 | **Order Placement**<br>*As a customer*, I want to provide my delivery address and contact information so that my grocery order is registered. | High (Must Have) | 5 | Contact & address validation (10-digit phone, 6-digit postal code), atomic stock reservation. |
| **US-04** | Sprint 2 | **Simulated Payment & COD**<br>*As a customer*, I want to complete my order using Cash on Delivery (COD) or simulated online payment (UPI/Card) so that I can checkout without a live payment gateway. | High (Must Have) | 8 | **Payment is simulated, with COD available.** No external banking gateway is integrated. Idempotency protection included. |
| **US-05** | Sprint 3 | **Delivery Updates**<br>*As a customer*, I want to view status-based delivery progression milestones so that I know the stage of my order fulfillment. | Medium (Should Have) | 5 | **Status-based tracking** (Placed → Confirmed → Preparing → Out for Delivery → Delivered). **Not live GPS tracking.** |
| **US-06** | Sprint 3 | **Order History**<br>*As a customer*, I want to view my past orders, itemized receipts, and order statuses so that I can review my purchase history. | Medium (Should Have) | 3 | Persistent customer order references, order receipts, and cancellation for eligible orders. |

**Total Original Committed Points:** 29 Story Points (Sprint 1: 8 SP + Sprint 2: 13 SP + Sprint 3: 8 SP).

---

## 2. Change Requests (CR) / Scope Adjustments

| Request ID | Proposed Change | Type | Story Points | Status | Scope Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **US-07 (CR)** | **Live Delivery Tracking**<br>*As a customer*, I want real-time GPS map tracking of delivery vehicles with live driver coordinates. | Change Request | TBD | **Pending Approval** | **Not part of the original 6 user stories or the 29 committed story points.** Requires evaluation of third-party map APIs and telematics before scheduling. |

---

## 3. Detailed Acceptance Criteria

### US-01: Product Search (3 Story Points — Sprint 1)
* **AC-01.1:** Customers can search products by name or keyword with real-time feedback.
* **AC-01.2:** Category filters allow isolating items by category (Fruits, Vegetables, Dairy & Eggs, Bakery, Beverages, Snacks, Staples).
* **AC-01.3:** Non-matching search queries present a clear empty-state notification without UI breakage.
* **AC-01.4:** Product cards display name, category, unit, price (₹), and stock availability.

### US-02: Shopping Cart (5 Story Points — Sprint 1)
* **AC-02.1:** Adding an item to the cart increments item count and updates subtotal immediately.
* **AC-02.2:** Quantities can be incremented, decremented, or removed (decrementing below 1 removes item).
* **AC-02.3:** Item quantity cannot exceed available warehouse stock; attempts trigger an out-of-stock toast/alert.
* **AC-02.4:** Subtotals, delivery fees, and order totals calculate accurately without floating-point errors.
* **AC-02.5:** Cart state persists across page navigation and browser refreshes.

### US-03: Order Placement (5 Story Points — Sprint 2)
* **AC-03.1:** Checkout requires recipient full name, valid 10-digit phone number, delivery address, and 6-digit postal pincode.
* **AC-03.2:** Form validation prevents submission with missing or invalid fields.
* **AC-03.3:** Order placement atomically reserves/deducts item stock in the database.
* **AC-03.4:** Successful placement generates a unique order reference code (e.g. `FC-YYYYMMDD-XXXXXXXX`).

### US-04: Simulated Payment & COD (8 Story Points — Sprint 2)
* **AC-04.1:** Customers can select between Cash on Delivery (COD) and Simulated Online Payment (UPI / Card).
* **AC-04.2:** **Payment is simulated; no external payment gateway or merchant account is utilized.**
* **AC-04.3:** Simulated online payment supports success verification and simulated error recovery.
* **AC-04.4:** Payment failure preserves the cart items and notifies the customer to retry or change method.
* **AC-04.5:** Checkout submissions utilize idempotency keys to prevent duplicate order placement on retry.

### US-05: Delivery Updates (5 Story Points — Sprint 3)
* **AC-05.1:** **Delivery tracking is strictly status-based; does not use live GPS tracking.**
* **AC-05.2:** Displays clear milestone progression: `Placed` → `Confirmed` → `Preparing` → `Out for Delivery` → `Delivered`.
* **AC-05.3:** Order timeline updates dynamically based on status changes managed by the store/admin.
* **AC-05.4:** Estimated delivery time and delivery address are clearly presented on the tracking view.

### US-06: Order History (3 Story Points — Sprint 3)
* **AC-06.1:** Customers can view a consolidated history of their previous orders.
* **AC-06.2:** Each past order displays order reference, placement date, total amount, payment method, and current status.
* **AC-06.3:** Clicking an order opens an itemized receipt modal with line-item quantities and price breakdowns.
* **AC-06.4:** Orders in cancellable states (`placed` or `confirmed`) can be cancelled, immediately releasing reserved inventory.
