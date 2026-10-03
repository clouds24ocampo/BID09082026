---
name: api-data-architect
description: Use when designing BiDOCS data contracts - TypeScript types, PhilGEPS ingestion shape, Express /api endpoints in server.js, repository boundaries between IndexedDB and any future cloud sync. Extends api-and-interface-design.
---

# API & Data Contracts (BiDOCS)

Start from `api-and-interface-design`.

## Current contracts
- Types: `src/types/index.ts` (`Tenant`, `User`, `DocumentVaultItem`, `PhilGEPSOpportunity`, `ChecklistRequirement`, `BidPackage`, `LegalRegime`, `BidLifecycleStatus`).
- HTTP (`server.js`): `GET /api/health`, `GET /api/opportunities`, `GET /api/vault/summary`, `GET /api/regime/status`, `POST /api/bids/verify`.
- Storage: IndexedDB `BiDOCS_VaultDB` v2 (`vault-local-storage`).

## Rules
1. Type first: change the interface, then fix `npx tsc --noEmit` errors outward.
2. Every record carries `tenantId`; project records also a project ref. Contracts must make isolation impossible to forget (required field, not optional).
3. External data (PhilGEPS, JSON import, API) parsed at the boundary into typed objects; reject unknown shapes, no `any` leakage inward.
4. Additive changes only for stored shapes; bump `DB_VERSION` + migrate for breaking ones.
5. If cloud sync (e.g. Supabase) is added: define a repository interface (`list/get/upsert/delete` by tenant) with IndexedDB as the first implementation; use `supabase` + `supabase-postgres-best-practices` and RLS on `tenant_id`. Supabase is not wired today.
6. Express: validate input, set explicit CORS origins, JSON error shape `{ error }`.
