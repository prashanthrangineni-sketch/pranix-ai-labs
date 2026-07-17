# Cart2Save — price comparison / affiliate
Repo: prashanthrangineni-sketch/pranix-witness-ui | Domain: cart2save.com

## Status: COMPLETED & VERIFIED (2026-07-13)
- **Dead Cron Jobs**: Verified that the three dead cron jobs (`cuelinks_daily_sync`, `commission_confidence_columns`, and `groceries_basket_hero_outflow`) are **fully deactivated/unscheduled** in the database. Only 8 active daily/weekly sync/maintenance jobs remain.
- **Secrets Audit**: Flagged `CUELINKS_TOKEN` / `CUELINKS_API_TOKEN` as stale (requires founder renewal on CueLinks dashboard) and `GITHUB_PAT` as exposed (locally hardcoded in git remote URLs, flagged for rotation).
- **PR Cleanup**: Verified that all open PRs on `prashanthrangineni-sketch/pranix-witness-ui` and `prashanthrangineni-sketch/cart2save-ondc-preprod` are successfully closed/merged (0 open PRs remain).

