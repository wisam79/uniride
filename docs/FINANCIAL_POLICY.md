# Financial Policy Architecture

## Goal

UniRide must support configurable financial policy from the admin dashboard. The code must not contain hardcoded business-critical prices, commissions, discounts, or penalties.

The database and admin-configured policies are the source of truth. Mobile and admin UI display values and submit intent; transactional RPCs perform the calculations and write snapshots.

## Core Rules

- Pricing policies are managed from the admin dashboard.
- Financial calculations happen in database RPCs or trusted server-side services.
- Money is stored as integers in IQD.
- Every subscription stores a financial snapshot.
- Every financial operation is auditable.
- Changing a policy affects future operations only unless an admin performs an explicit audited adjustment.
- Frontend code may format money but must not decide business financial outcomes.

## Recommended Schema

```sql
CREATE TABLE pricing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global', 'institution', 'route', 'driver')),
  institution_id uuid REFERENCES institutions(id),
  route_id uuid REFERENCES routes(id),
  driver_id uuid REFERENCES drivers(id),
  monthly_fee_iqd integer NOT NULL CHECK (monthly_fee_iqd >= 0),
  commission_type text NOT NULL CHECK (commission_type IN ('fixed', 'percentage')),
  commission_value_iqd integer CHECK (commission_value_iqd >= 0),
  commission_bps integer CHECK (commission_bps >= 0),
  referral_discount_iqd integer DEFAULT 0 CHECK (referral_discount_iqd >= 0),
  cancellation_fee_type text CHECK (cancellation_fee_type IN ('fixed', 'percentage')),
  cancellation_fee_value_iqd integer CHECK (cancellation_fee_value_iqd >= 0),
  cancellation_fee_bps integer CHECK (cancellation_fee_bps >= 0),
  absence_deduction_type text CHECK (absence_deduction_type IN ('fixed', 'percentage')),
  absence_deduction_value_iqd integer CHECK (absence_deduction_value_iqd >= 0),
  absence_deduction_bps integer CHECK (absence_deduction_bps >= 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id),
  student_id uuid REFERENCES profiles(id),
  driver_id uuid REFERENCES drivers(id),
  pricing_policy_id uuid REFERENCES pricing_policies(id),
  gross_amount_iqd integer NOT NULL DEFAULT 0,
  company_commission_iqd integer NOT NULL DEFAULT 0,
  driver_payout_iqd integer NOT NULL DEFAULT 0,
  discount_iqd integer NOT NULL DEFAULT 0,
  refund_iqd integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Subscription Snapshot Fields

Subscriptions should store:

- `pricing_policy_id`
- `monthly_fee_iqd`
- `commission_type_snapshot`
- `commission_value_snapshot`
- `company_commission_iqd`
- `driver_payout_iqd`
- `discount_iqd`
- `payment_status`
- `activated_at`
- `cancelled_at`
- `refund_iqd`

## Pricing Resolution Order

When creating or activating a subscription, resolve policy in this order:

1. Driver-specific active policy.
2. Route-specific active policy.
3. Institution-specific active policy.
4. Global active policy.

If no valid policy exists, the RPC must fail with `NO_ACTIVE_PRICING_POLICY`.

## Required RPCs

- `resolve_pricing_policy(p_student_id, p_driver_id, p_route_id)`
- `request_subscription(p_student_id, p_driver_id, p_route_id)`
- `accept_subscription_request(p_request_id)`
- `activate_subscription(p_subscription_id, p_payment_reference)`
- `activate_card(p_card_code, p_student_id)`
- `cancel_subscription_with_refund(p_subscription_id, p_reason)`
- `record_driver_absence(p_driver_id, p_absence_date, p_reason)`

## Required Failure Tests

- No active policy blocks subscription activation.
- Fixed commission calculates correctly.
- Percentage commission calculates correctly.
- Commission cannot exceed gross amount unless explicitly allowed by policy.
- Old subscriptions keep old snapshot after policy update.
- Two students cannot consume the last seat concurrently.
- Same idempotency key cannot process twice.
- Student cannot change financial fields from mobile.
- Driver cannot change commission or payout.

