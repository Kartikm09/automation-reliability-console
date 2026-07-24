# Contributing

This project welcomes focused fixes, tests, documentation, and synthetic
provider fixtures.

1. Open an issue describing the behavior and acceptance criteria.
2. Create a branch from `main`.
3. Keep all data fictional and remove credentials from logs and fixtures.
4. Run `make verify`.
5. Submit a pull request with test evidence and security impact.

Do not submit real webhook payloads, customer names, credentials, or unrestricted
production logs. Reviewers should prioritize tenant isolation, functional
correctness, state-machine integrity, and regression evidence over style.
