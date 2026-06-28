# Security Specification for Deadline Guardian AI

This security specification details the access control constraints, data invariants, and defensive validation rules for the Deadline Guardian AI Firebase Firestore collections.

## 1. Data Invariants
1. A user profile (`users/{userId}`) can only be created or modified by the authenticated user whose `uid` matches the `{userId}`.
2. A task, habit, goal, or activity log document can only be accessed (read, list, write, delete) by the authenticated user who owns the parent `{userId}` route.
3. Timestamps like `createdAt` and `updatedAt` must match `request.time`.
4. Role escalation is blocked; users cannot declare themselves as arbitrary roles.

## 2. The "Dirty Dozen" Malicious Payloads (Denied)
1. **Unauthenticated Read**: Attempting to read a user's task when not logged in.
2. **Cross-User Hijacking**: Authenticated user `A` attempting to read user `B`'s tasks.
3. **Cross-User Write**: Authenticated user `A` attempting to create/update a task in user `B`'s collection.
4. **Task Identity Spoofing**: Creating a task with a fake ID or empty title.
5. **Junk ID Poisoning**: Ingesting a task with a 20KB random string ID.
6. **Task Status Injection**: Setting status to a value not in `TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`.
7. **Negative Effort rating**: Setting task effort to -100 or 150 (must be 1-10).
8. **Negative Duration**: Creating a task with -10 minutes duration.
9. **Fake Streak Alteration**: Directly editing a habit's `streak` to a massive value without completing a day.
10. **Admin Spoofing**: Attempting to insert or update user profile with `role: "Admin"` to bypass boundaries.
11. **Future Timestamp Forgery**: Specifying a future client-generated time for `createdAt` instead of `request.time`.
12. **Blind Collection Scraping**: Requesting all tasks across all users via a global search query without matching `{userId}`.

## 3. Test Runner Definition
The following test suite verifies the validation rules:
```typescript
// firestore.rules.test.ts (conceptual)
describe("Deadline Guardian AI Security Rules", () => {
  it("should deny unauthenticated read access to user data", async () => { ... });
  it("should block cross-user data manipulation", async () => { ... });
  it("should block malicious status injections", async () => { ... });
});
```
