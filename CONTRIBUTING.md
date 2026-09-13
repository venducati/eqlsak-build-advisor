# Contributing

Use Issues for problems, ideas, and game-data corrections. Check existing issues first.

## Propose a change

1. Fork this repository and create a branch with a short, useful name.
2. Make a focused change. Keep other features working.
3. Add a meaningful regression check for a logic change. Run the checks in README.md.
4. Open a pull request. Explain the problem, resulting behavior, tests, and known limits.

For game information, include the source URL, date checked, relevant classes and level, and any disagreement among sources. Use multiple EQL sources when available. A community opinion must remain labeled as opinion; legacy EverQuest information is not automatically verified for EQL. Do not paste whole articles or extract game assets.

Keep recommendation logic deterministic and local. Preserve accessibility, readable text, optional online checks, and rule-update preview/rollback. Do not add remote inference, telemetry, or automatic uploads of player logs.

## Keep the record useful

- Use clear commit messages and link relevant issues in pull requests.
- Record user-visible changes in CHANGELOG.md.
- Give each distributed version its own tag and release notes. Publish the matching source and file checksums.
- Identify your fork and its changes. Retain the MIT license and attribution.
- Never commit credentials, real player logs, private chat, machine paths, personal profiles, or build caches. Use small invented test events.

Code contributions are provided under this repository's MIT license. Added art or data needs a documented compatible permission statement. For a possible security problem, follow SECURITY.md rather than posting sensitive details publicly.
