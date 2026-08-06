# CRM CSV alignment status

This project aligns CRM screens/APIs with these legacy CSV files:

- `database/crm_branches.csv`
- `database/crm_histories.csv`
- `database/crm_regions.csv`
- `database/crm_targets.csv`
- `database/crm_townships.csv`
- `database/crm_users.csv`

## Implemented alignment

- **CRM navigation group** under app shell:
  - `CRM Dashboard`
  - `CRM History`
  - `Create or New Record`
  - `Performance`
  - `Report`
- **History request aliases** support both camelCase and CSV snake_case:
  - `branchId` / `branch_id`
  - `customerName` / `customer_name`
  - `phone` / `phone_number`
  - `birthday` / `date_of_birth`
  - `inviteStatus` / `invite_status`
  - `customerCondition` / `customer_condition`
  - `regionId` / `region_id`
  - `townshipId` / `township_id`
- **History list/export query aliases** also support snake_case.
- **History Excel export headers** now follow `crm_histories.csv` columns.
- **Invite status** handles both enum style and legacy snake_case values.
- **Performance buckets** now expose CSV-compatible keys:
  - `amount_50_to_100`
  - `amount_100_to_300`
  - `amount_300_to_500`
  - `amount_500_to_1000`
  - `amount_above_1000`
  - `amount_other`

## Legacy created_by mapping

- Added `crm_history.legacy_created_by_user_id` for strict mapping with
  `crm_histories.csv.created_by` (legacy numeric user id).
- Legacy import now stores both:
  - `legacy_created_by_user_id` (numeric id from Laravel)
  - `created_by` / `updated_by` (human-readable staff name)
- History Excel export writes `created_by` using `legacy_created_by_user_id` when available.
