---
name: senior-qa
description: >-
  Comprehensive QA and testing skill for quality assurance, test automation, and
  testing strategies for ReactJS, NextJS, and NodeJS applications. Includes test
  suite generation, coverage analysis, E2E testing setup, and quality metrics.
  Use when designing test strategies, writing test cases, implementing test
  automation, performing manual testing, or analyzing test coverage.
---

# Senior QA (Antigravity Adaptation)

Adapted from `development/senior-qa` (`claude-code-templates`) for Antigravity workspaces.

## Antigravity Tool Mapping

- Read specs, source files, and reference docs with `read_file`.
- Run project test suites, linters, typechecks, and helper scripts via `run_command`.
- Write or update test files with `write_file` / `edit_file`.
- Delegate interactive browser verification to the `browser` subagent when needed.

## Quick Start

### Main Capabilities

This skill provides three automated helper scripts inside `.agents/skills/senior-qa/scripts/`:

- **Test Suite Generator:** [test_suite_generator.py](./scripts/test_suite_generator.py)
- **Coverage Analyzer:** [coverage_analyzer.py](./scripts/coverage_analyzer.py)
- **E2E Test Scaffolder:** [e2e_test_scaffolder.py](./scripts/e2e_test_scaffolder.py)

```bash
python .agents/skills/senior-qa/scripts/test_suite_generator.py <project-path> [options]
python .agents/skills/senior-qa/scripts/coverage_analyzer.py <target-path> [--verbose]
python .agents/skills/senior-qa/scripts/e2e_test_scaffolder.py [arguments] [options]
```

## Reference Documentation

Read on demand via `read_file` when deeper guidance is needed:

- **Testing Strategies:** [testing_strategies.md](./references/testing_strategies.md) — patterns, examples, best practices, and anti-patterns.
- **Test Automation Patterns:** [test_automation_patterns.md](./references/test_automation_patterns.md) — step-by-step workflows, optimization, CI integration, and troubleshooting.
- **QA Best Practices:** [qa_best_practices.md](./references/qa_best_practices.md) — stack details, config examples, security checks, and scalability guidelines.

## `qeydai` (`panelim.az`) Verification Commands

When working inside this repository, run the standard verification pipeline rather than ad-hoc runners:

```bash
npx tsc --noEmit
npm run lint
npm test         # Vitest unit & API integration tests
npm run build    # Next.js production build
npm run e2e      # Playwright desktop + mobile E2E tests (uses QEYDAI_FORCE_SQLITE=1)
```

## Core Quality Workflow

1. **Scope by Change & Risk:** Inspect `git status` and `git diff` to identify high-risk paths (auth, multi-tenant RLS isolation, billing/Paycell webhooks, rate limiting, i18n, accessibility).
2. **Analyze Coverage & Gaps:** Run `npm test` or `coverage_analyzer.py` to find untested branches and edge cases before adding new tests.
3. **Implement Layered Tests:** Keep pure logic and API route contracts in Vitest (`*.test.ts`), component behavior in React Testing Library (`*.test.tsx`), and critical user flows across desktop/mobile in Playwright (`tests/e2e/*.spec.ts`).
4. **Verify Strictly:** Report only counts and statuses directly observed from executed commands after the final edit.
