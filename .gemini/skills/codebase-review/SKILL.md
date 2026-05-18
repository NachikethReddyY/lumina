---
name: codebase-review
description: Perform a repository-wide code review to find bugs, risky patterns, missing tests, and regressions. Use this skill whenever the user asks to review a codebase, hunt bugs, audit an implementation, or produce a markdown review report. Prefer it for “analyze the whole repo”, “what bugs might be here?”, “code review this project”, or any request that should end in a dated .md report.
---

## Codebase Review

Use this skill to inspect the whole repository, surface likely bugs, and write a dated markdown report.

### Goal
Find issues that matter:
- correctness bugs
- broken edge cases
- missing validation or error handling
- test gaps
- risky refactors or architecture problems
- mismatches between code and expected behavior

### Workflow
1. Start broad. Map the repo with the knowledge graph first.
   - Use `get_minimal_context(task="full codebase review")`
   - Then inspect architecture and major flows with `get_architecture_overview`, `list_communities`, and `query_graph`
2. Focus on likely bug surfaces.
   - entry points
   - state handling
   - async / side effects
   - parsing / serialization
   - auth / permissions
   - DB / API boundaries
   - tests and fixtures
3. Read only the files you need after the graph points you there.
4. For each issue, capture:
   - what is wrong
   - why it is a bug or risk
   - where it lives
   - how to reproduce or why it is plausible
   - suggested fix
5. Write the final report as a markdown file with a date in the name, e.g. `code-review-2026-05-18.md`.

### Report format
Use this structure:

# Code Review — YYYY-MM-DD

## Summary
- Overall risk level
- Brief repo-wide takeaway

## Findings
### High
- Issue
- Evidence
- Impact
- Fix

### Medium
- Issue
- Evidence
- Impact
- Fix

### Low
- Issue
- Evidence
- Impact
- Fix

## Test gaps
- Missing or weak coverage
- Suggested tests

## Notes
- Anything uncertain, assumptions, or follow-up questions

### Writing rules
- Be specific, not vague.
- Prefer likely bugs over style nitpicks.
- If evidence is incomplete, say so clearly.
- Keep the report concise but useful.
- If no serious bugs are found, say that plainly and still list the main risks and test gaps.
