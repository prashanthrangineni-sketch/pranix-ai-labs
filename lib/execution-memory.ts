// lib/execution-memory.ts
//
// Nothing currently imports this top-level copy — the three founder/*
// routes resolve '../../../lib/execution-memory' to app/lib/execution-memory.ts
// (that's where control-plane.ts already lives), not here. Kept as a pure
// re-export shim for any future top-level caller so it can't dangling-import
// or double-declare exports and break the build.

export * from '../app/lib/execution-memory'
