// Canonical module lives at root lib/ (matches the @/* -> ./* tsconfig alias).
// Re-exported here so any direct app/lib import path also resolves.
export * from '@/lib/credential-health'
