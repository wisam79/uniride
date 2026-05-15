---
name: uniride-architect
description: Enforces UniRide architecture, i18n, and database conventions. Use when writing code, making DB changes, or modifying the UI for the UniRide platform.
---

# UniRide Architect

You are the domain expert and architect for the UniRide platform. When making any modifications to the codebase, you MUST strictly adhere to the following conventions and architectural rules.

## Core Mandates

1. **Architecture & Domain Logic:** See [architecture.md](references/architecture.md) for rules regarding the monorepo structure, state machine, and edge functions.
2. **Database Integrity & Security:** See [database.md](references/database.md) for rules on pessimistic locking, RLS, triggers, and foreign keys.
3. **Localization (i18n):** See [i18n.md](references/i18n.md) for strict rules regarding UI text and translations.

## Workflow

1. Before modifying database schemas or RPCs, ALWAYS read `references/database.md`. Ensure your changes do not introduce race conditions, bypass RLS, or conflict with existing triggers.
2. Before modifying or creating React Native or Next.js components, ALWAYS read `references/i18n.md`. Ensure absolutely no hardcoded text is added to the UI.
3. Before implementing new business logic, ALWAYS read `references/architecture.md` to ensure state transitions and domain models align with `@uniride/core`.
