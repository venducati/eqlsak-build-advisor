# Contributing

Use Issues for problems, ideas, and game-data corrections. Check existing issues first.

## Propose a change

1. Fork this repository and create a branch with a short, useful name.
2. Make a focused change. Keep other features working.
3. Add a meaningful regression check for a logic change. Run the checks in README.md.
4. Open a pull request. Explain the problem, resulting behavior, tests, and known limits.

For game information, include the source URL, date checked, relevant classes and level, and any disagreement among sources. Use multiple EQL sources when available. A community opinion must remain labeled as opinion; legacy EverQuest information is not automatically verified for EQL. Do not paste whole articles or extract game assets.

Keep recommendation logic deterministic and local. Preserve accessibility, readable text, optional online checks, and rule-update preview/rollback. Do not add remote inference, telemetry, or automatic uploads of player logs.

## Keep the layout easy to read

- Use the shared spacing in `app/advisor-spacing.css`. Keep clear gaps between panels and between a panel and the text around it.
- Use generous line spacing for instructions and explanations (about 1.75 times the text size), with separate paragraph margins. Keep headings close to the content they introduce, with more space before the next section.
- Let class fields and other controls wrap or stack when space is limited. Do not shrink text and padding to force several controls into a narrow row.
- Pair icons and color with plain text labels. Keep instructions short and use the same words for the same action.
- Review changed screens at wide and narrow window sizes, with expanded instructions and realistic content. Check for clipped text, overlapping controls, cramped rows and page overflow before publishing. Use invented data and an isolated profile for screenshots.

The installation guide has matching spacing in its own style block. Keep that standalone file readable when opened directly or printed.

## Keep the record useful

- Use clear commit messages and link relevant issues in pull requests.
- Record user-visible changes in CHANGELOG.md.
- Give each distributed version its own tag and release notes. Publish the matching source and file checksums.
- Identify your fork and its changes. Retain the MIT license and attribution.
- Never commit credentials, real player logs, private chat, machine paths, personal profiles, or build caches. Use small invented test events.

Code contributions are provided under this repository's MIT license. Added art or data needs a documented compatible permission statement. For a possible security problem, follow SECURITY.md rather than posting sensitive details publicly.
