# Definition of Done (DoD)

**Project:** FreshCart — Online Grocery Application  
**Standard:** Applicable to every User Story and Sprint Increment

---

A User Story or Task is considered **Done** only when all the following criteria are satisfied:

### 1. Functional Requirements
- [ ] All Acceptance Criteria defined for the User Story are completely implemented.
- [ ] Both primary flow (happy path) and edge cases / error states function as specified.
- [ ] User input validation is enforced on both frontend and backend.

### 2. Code Quality & Standards
- [ ] Code adheres to TypeScript strict typing (no untyped `any` without explicit justification).
- [ ] Backend follows PEP 8 standards and Pydantic schema validation.
- [ ] No unused imports, leftover debug logs, or dead commented-out code.
- [ ] Frontend builds cleanly with zero errors (`npm run build`).

### 3. Testing & Verification
- [ ] Relevant test cases in `docs/testing/test_case_register.md` have been executed.
- [ ] Actual results match Expected Results and are documented with timestamp.
- [ ] No unhandled exceptions or console errors occur during normal user journeys.

### 4. Persistence & Data Integrity
- [ ] Database schema migrations or table creations are idempotent.
- [ ] CRUD operations preserve relational constraints (e.g. order item references).
- [ ] Stock availability is updated atomically on confirmed transactions.

### 5. Version Control & Documentation
- [ ] Changes are committed to an isolated feature branch with descriptive conventional commit messages.
- [ ] Relevant documentation (README, API schemas, or agile registers) is updated.
- [ ] Code is peer-reviewed prior to merging into `main`.
