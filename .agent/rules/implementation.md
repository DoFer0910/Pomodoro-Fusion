---
trigger: always_on
---

# Implementation & Delegation Rule

## Codex Delegation Criteria
Gemini must delegate tasks to the Codex agent (or use `codex` command) in the following scenarios:
1. **Complex Logic & Algorithms**: Implementation requiring high performance or complex logic.
2. **Boilerplate Generation**: Generating large amounts of repetitive code or test cases.
3. **Self-Correction**: Seeking a second opinion if Gemini's code fails to pass tests more than once.

## Quality & Verification
- **Verification**: Gemini is responsible for running tests and verifying the final output.
- **Feedback Loop**: If errors occur, Gemini must provide logs to Codex for refinement.
- **Standards**: Follow the latest best practices for clean, maintainable, and secure code.