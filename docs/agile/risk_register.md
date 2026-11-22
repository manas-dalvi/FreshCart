# Risk Register

**Project:** FreshCart — Online Grocery Application  
**Assessment Matrix:** Probability (Low / Medium / High) × Impact (Low / Medium / High)

---

| Risk ID | Description | Probability | Impact | Mitigation Strategy | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Port collision or CORS failure between Next.js (port 3000) and FastAPI (port 8000). | Medium | High | Configure explicit CORS middleware on FastAPI allowing frontend origin; use configurable base URL in frontend client. | Member 3 | Mitigated |
| **RSK-02** | SQLite concurrency locks under concurrent write requests during order placement. | Low | Medium | Use proper SQLAlchemy session lifecycle, scoped sessions, and WAL mode if needed. | Member 3 | Monitored |
| **RSK-03** | Orbit Carousel component integration issues when adapted from static template to dynamic grocery items. | Medium | Medium | Modularize carousel logic into clean React subcomponents with isolated animation states and clear prop contracts. | Member 2 | Open |
| **RSK-04** | Inventory desynchronization between cart and available stock during checkout. | Medium | High | Perform server-side validation of stock availability immediately prior to order confirmation. | Member 4 | Open |
| **RSK-05** | Node / Python environment mismatch on jury presentation machine. | Low | High | Document exact runtime versions (Node v24, Python 3.12) and provide single-command startup scripts. | Member 1 | Open |
