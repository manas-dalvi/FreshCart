# Sprint Planning & Sprint Backlogs

**Project:** FreshCart — Online Grocery Application  
**Agile Framework:** Scrum  
**Total Committed Sprints:** Exactly 3 Original Sprints  
**Total Committed Story Points:** Exactly 29 Story Points  

---

## Sprint Overview & Point Distribution

| Sprint | Focus Area | Committed User Stories | Committed Story Points | Cumulative Points |
| :---: | :--- | :--- | :---: | :---: |
| **Sprint 1** | Discovery & Cart Management | **US-01:** Product Search (3 SP)<br>**US-02:** Shopping Cart (5 SP) | **8 SP** | 8 SP |
| **Sprint 2** | Checkout & Payment Simulation | **US-03:** Order Placement (5 SP)<br>**US-04:** Simulated Payment & COD (8 SP) | **13 SP** | 21 SP |
| **Sprint 3** | Fulfillment & Order History | **US-05:** Delivery Updates (5 SP)<br>**US-06:** Order History (3 SP) | **8 SP** | 29 SP |
| **Total** | **Original Committed Scope** | **6 User Stories (US-01 to US-06)** | **29 SP** | **29 SP** |

---

## 1. Sprint 1 Plan: Discovery & Cart Management
* **Sprint Goal:** Establish grocery product discovery via search/category filtering and implement reliable shopping cart management.
* **Committed Story Points:** 8 Story Points
* **Sprint Backlog Items:**
  * **US-01: Product Search (3 SP)**
    * Real-time search query filtering and suggestions.
    * Category browsing (Fruits, Vegetables, Dairy & Eggs, Bakery, Beverages, Snacks, Staples).
    * Empty-state handling for non-matching queries.
  * **US-02: Shopping Cart (5 SP)**
    * Cart drawer/view with itemized listing, quantity updates, and item removal.
    * Exact subtotal, delivery fee calculation, and free delivery thresholds.
    * Server-aligned stock limits preventing over-ordering.
    * Client-side cart persistence across sessions.

---

## 2. Sprint 2 Plan: Checkout & Payment Simulation
* **Sprint Goal:** Deliver delivery address validation, order placement mechanics, and simulated payment workflows with Cash on Delivery.
* **Committed Story Points:** 13 Story Points
* **Sprint Backlog Items:**
  * **US-03: Order Placement (5 SP)**
    * Delivery details form validation (recipient name, 10-digit phone, address, 6-digit postal code).
    * Order reference generation (`FC-YYYYMMDD-XXXXXXXX`).
    * Database order creation with atomic stock decrement.
  * **US-04: Simulated Payment & COD (8 SP)**
    * **Simulated payment processing with COD available (no real payment gateway integration).**
    * Configurable simulated online payment success and failure paths.
    * Idempotency key implementation to guard against accidental duplicate orders.
    * Failure state recovery preserving cart items for user retry.

---

## 3. Sprint 3 Plan: Fulfillment & Order History
* **Sprint Goal:** Provide status-based delivery progression tracking and comprehensive customer order history.
* **Committed Story Points:** 8 Story Points
* **Sprint Backlog Items:**
  * **US-05: Delivery Updates (5 SP)**
    * **Status-based delivery progression tracking (not live GPS tracking).**
    * Multi-stage milestone visual stepper (`Placed` → `Confirmed` → `Preparing` → `Out for Delivery` → `Delivered`).
    * Real-time reflection of order status transitions.
  * **US-06: Order History (3 SP)**
    * Order history list displaying past orders by persistent customer references.
    * Itemized order receipts with unit costs, breakdown, and shipping details.
    * Pre-dispatch cancellation capability with immediate stock restoration.

---

## 4. Change Request Note: US-07 (CR)
* **US-07 Live Delivery Tracking:** Proposed change request for real-time driver GPS tracking, currently **pending approval**.
* **Scope Boundary:** US-07 is **not** part of the original 6 user stories and is **not** included in the 29 committed story points.
