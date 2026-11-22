# FreshCart — Online Grocery Application

An end-to-end Online Grocery Application developed using Agile Software Development methodologies for the final academic jury presentation.

---

## 1. Project Overview & Tech Stack
* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons
* **Backend:** FastAPI, Python 3.12, Pydantic v2
* **Persistence:** SQLite with SQLAlchemy ORM
* **Version Control:** Git & GitHub (`https://github.com/manas-dalvi/online-grocery-agile-demo`)

---

## 2. Project Structure
```text
FreshCart/
├── frontend/                     # Next.js App Router, TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── app/                  # App routes (layout, page, api proxy)
│   │   ├── components/           # UI components, Dish Orbit Carousel
│   │   └── lib/                  # Shared utilities & API client
│   ├── package.json
│   └── tsconfig.json
├── backend/                      # FastAPI Application
│   ├── app/
│   │   ├── core/                 # Config & settings
│   │   ├── routers/              # Health & domain endpoints
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic data validation schemas
│   │   ├── database.py           # SQLite connection & session maker
│   │   └── main.py               # FastAPI entry point
│   ├── requirements.txt
│   └── .venv/                    # Project-level Python virtual environment
├── docs/                         # Agile Methodology & Architecture Artifacts
│   ├── agile/                    # Backlog, Sprints, DoD, Team Allocation, Risk Register
│   ├── architecture/             # Architecture overview & system design
│   └── testing/                  # Test Plan, Test Case Register, Defect Register
├── .github/
│   └── workflows/ci.yml          # GitHub Actions CI workflow
├── .gitignore                    # Environment & dependency ignore rules
└── README.md                     # Project documentation
```

---

## 3. Agile Framework & Sprint Delivery Structure

The project scope is strictly organized around **3 original sprints** comprising **6 original user stories** totaling **29 committed story points**:

| Sprint | Focus Area | User Stories | Points | Key Deliverables |
| :---: | :--- | :--- | :---: | :--- |
| **Sprint 1** | Discovery & Cart Management | **US-01:** Product Search (3 SP)<br>**US-02:** Shopping Cart (5 SP) | **8 SP** | Real-time product search, category browsing, cart math calculations, itemized additions/removals, and client-side persistence. |
| **Sprint 2** | Checkout & Payment Simulation | **US-03:** Order Placement (5 SP)<br>**US-04:** Simulated Payment & COD (8 SP) | **13 SP** | Shipping address validation (10-digit phone, 6-digit postal code), idempotency keys, **simulated online payment & Cash on Delivery (COD)**. *(No real payment gateway).* |
| **Sprint 3** | Fulfillment & Order History | **US-05:** Delivery Updates (5 SP)<br>**US-06:** Order History (3 SP) | **8 SP** | **Status-based delivery progression tracking** (Placed → Confirmed → Preparing → Out for Delivery → Delivered; *not live GPS tracking*), customer order receipts, and pre-dispatch cancellation. |
| **Total** | **Original Committed Scope** | **6 User Stories (US-01 to US-06)** | **29 SP** | Complete end-to-end grocery workflow. |

> **Change Request Note (US-07):**  
> **US-07 Live Delivery Tracking** is a proposed change request for live GPS driver tracking, currently **pending approval**. It is **not** part of the original 6 user stories and is **not** included in the 29 committed story points.

---

## 4. Agile Team Allocation (5 Members)
* **Member 1:** Scrum Master & Product Owner (Agile coordination, backlog prioritization, sprint ceremonies, defect & risk tracking)
* **Member 2:** Frontend Lead (Next.js App Router, Tailwind styling, responsive UI/UX, Dish Orbit Carousel)
* **Member 3:** Backend Lead (FastAPI application structure, SQLAlchemy models, SQLite persistence, API endpoints)
* **Member 4:** Full-Stack & Integration Engineer (API proxy wiring, cart state management, checkout flow, simulated payment handling)
* **Member 5:** QA & Test Engineer (Test Plan, test case registers, defect register, verification evidence)

---

## 5. Agile Documentation Index
* [Team Allocation](docs/agile/team_allocation.md)
* [Product Backlog & User Stories](docs/agile/product_backlog.md)
* [Sprint Planning & Sprint Backlogs](docs/agile/sprint_planning.md)
* [Definition of Done](docs/agile/definition_of_done.md)
* [Sprint Review & Retrospective](docs/agile/sprint_review_retrospective.md)
* [Risk Register](docs/agile/risk_register.md)
* [Architecture Overview](docs/architecture/architecture_overview.md)
* [Test Plan](docs/testing/test_plan.md)
* [Test Case Register](docs/testing/test_case_register.md)
* [Defect Register](docs/testing/defect_register.md)

---

## 6. Testing & Quality Assurance Summary

* **Automated Backend Regression (Previously Reported Result):**
  * In prior phase audits, 8 standalone Python test suites (comprising 81 automated assertions across cart math, checkout idempotency, order lifecycle, RBAC admin security, and inventory movement ledgers) were executed and reported as passing (**81/81 Pass**).
  * *Audit Clarification:* These checks run via standalone scripts (`backend/app/test_*.py`) rather than an integrated `pytest` reporting suite. This metric reflects previously reported verification results and was not re-benchmarked via a pytest report during this documentation audit.
* **Manual Testing Execution Summary (Authoritative Register):**
  * **Total Test Cases:** 18
  * **PASS:** 13
  * **FAIL:** 0
  * **NOT EXECUTED:** 5 (TC-03, TC-05, TC-09, TC-12, TC-14)
  * **Pass Rate:** 100% of executed cases (13/13).
  * **Scope Breakdown:** 14 cases mapped across core user stories US-01 to US-05 (10 PASS, 4 NOT EXECUTED) + 4 cross-cutting system tests covering Admin Inventory Management, Admin Security & RBAC, and Order Lifecycle & Inventory Integrity (3 PASS, 1 NOT EXECUTED).
  * See the authoritative [Test Case Register](docs/testing/test_case_register.md) for individual test scenarios and story-wise traceability.

---

## 7. Version Control Workflow & Status
* **Main Branch:** Stable production baseline.
* **Feature Branches:** Isolated feature development (`feature/<name>`) branched from `main`.
* **Pull Requests:** Code review and Definition of Done verification prior to merging.
* **Implementation Boundary:** Payment processing is simulated with Cash on Delivery (COD) available; delivery tracking is status-based milestone updates (not live GPS tracking).
