# Security Specification - BinWise

## Data Invariants
1. A `bin` must have a unique ID and valid levels (0-100).
2. A `depositLog` must reference a valid `binId`.
3. `timestamp` counts must be server-validated.
4. Users cannot change their own roles (default to 'viewer').

## Dirty Dozen Payloads (Rejection Expected)
1. Creating a bin with a 1MBID.
2. Updating a bin's `status` to 'broken' as a non-admin.
3. Creating a log for a non-existent bin.
4. Setting a `depositLog.timestamp` to a future date.
5. Modifying someone else's `user.email`.
6. Injecting a 'staff' role into a user profile on creation.
7. Deleting a bin as a regular user.
8. Updating `bins` without the `status` field.
9. Reading `users/{otherUserId}` as a non-admin.
10. Creating a log with negative `weight`.
11. Bypassing size limits for `bin.location` (e.g., 10KB string).
12. Updating `bin.id` after creation (immutable).

## Firestore Rules Draft
(See DRAFT_firestore.rules)
