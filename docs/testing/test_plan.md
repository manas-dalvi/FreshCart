# Test Plan

**Project:** FreshCart — Online Grocery Application  
**Test Strategy:** Multi-Tier Verification (Automated Backend Suites & Manual End-to-End Test Cases)  
**Agile Traceability:** Aligned with the 6 Original User Stories across 3 Sprints (29 Committed Story Points)

---

## 1. Scope of Testing

Testing covers the complete customer and operational journey across the 6 original user stories:
* **Sprint 1 (8 SP):**
  * **US-01: Product Search (3 SP):** Real-time debounced search, category filtering, product catalog navigation.
  * **US-02: Shopping Cart (5 SP):** Cart math precision, item additions/removals, stock limit enforcement, and client state persistence.
* **Sprint 2 (13 SP):**
  * **US-03: Order Placement (5 SP):** Shipping address validation (10-digit phone, 6-digit postal code), atomic database order reservation, unique reference generation.
  * **US-04: Simulated Payment & COD (8 SP):** **Simulated payment processing with Cash on Delivery (COD) available.** Verification of success and failure simulation pathways and duplicate submission prevention via idempotency keys. *(No live banking gateway is integrated).*
* **Sprint 3 (8 SP):**
  * **US-05: Delivery Updates (5 SP):** **Status-based delivery progression tracking (not live GPS tracking)** through milestone transitions (`Placed` → `Confirmed` → `Preparing` → `Out for Delivery` → `Delivered`).
  * **US-06: Order History (3 SP):** Order history listing by customer reference, itemized order receipts, and pre-dispatch order cancellation with instant stock replenishment.

*(Scope Boundary Note: US-07 Live Delivery Tracking is a proposed change request pending approval and is out of scope for the 29 committed story points).*

---

## 2. Test Environments

* **Frontend:** Next.js development server (`http://localhost:3000`) and production build verification (`npm run build`).
* **Backend:** FastAPI Uvicorn server (`http://localhost:8000`).
* **Database:** SQLite (`backend/freshcart.db`).

---

## 3. Test Methodology & Categories

1. **Automated Backend Regression (Previously Reported Result):**
   - 8 custom test suites (`backend/app/test_*.py`) validating cart math, checkout idempotency, order lifecycle, RBAC admin security, inventory ledger auditing, and proxy endpoints (previously reported as 81/81 assertions passed).
   - *Note:* Standalone Python verification scripts; not configured with an integrated pytest test runner or test report.
2. **Manual End-to-End Verification:**
   - Formal test case execution documented in `docs/testing/test_case_register.md`.
   - **Latest Manual Testing Summary:** Exactly 18 cases: **13 Pass, 0 Fail, 5 Not Executed** (14 core user-story tests across US-01 to US-05 + 4 cross-cutting system tests covering Admin Inventory Management, Admin Security & RBAC, and Order Lifecycle & Inventory Integrity).
3. **Negative & Edge-Case Testing:**
   - Quantity cap at available stock, invalid contact inputs, payment failure simulation, and unauthorized access to administrative endpoints (`HTTP 401`).
