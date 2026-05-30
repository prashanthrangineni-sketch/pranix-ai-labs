// DEPRECATED — F.2C Phase 1.
//
// Server-side AAL / step-up enforcement has been removed. The original F.2C
// design gated founder-control writes on AAL2 via MFA-WebAuthn; that path is
// platform-disabled on this project ("Enabling of MFA with WebAuthn not
// currently supported"). The replacement uses Supabase Passkeys purely as a
// DASHBOARD UNLOCK and introduces NO AMR-based authorization in Phase 1
// (founder decision). Control routes are gated by founder session only, as
// before F.2C.
//
// This module is intentionally inert and is no longer imported anywhere.
// Kept as a stub because the toolchain cannot delete files; safe to delete
// via the GitHub UI.
export {}
