#!/bin/bash
# Hook 5: Intercept package installs and surface for review
# Fires on: Bash tool calls

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Detect package install commands
if echo "$COMMAND" | grep -qE "^(npm install|npm i|yarn add|pnpm add|pnpm install) "; then
  # Extract package names (everything after the install command, strip flags)
  PACKAGES=$(echo "$COMMAND" | sed -E 's/^(npm install|npm i|yarn add|pnpm add|pnpm install) //' | tr ' ' '\n' | grep -v '^-' | tr '\n' ' ')

  echo "[OFFLINE RISK / LICENSE] Package install intercepted." >&2
  echo "Packages: $PACKAGES" >&2
  echo "" >&2
  echo "Before installing, confirm:" >&2
  echo "  1. Is this package bundleable offline? (no runtime CDN fetch required)" >&2
  echo "  2. License compatible with commercial use? (no GPL)" >&2
  echo "  3. Does it add any analytics, tracking, or network calls?" >&2
  echo "" >&2
  echo "Blocked. Jack: review the package and run the install manually if approved." >&2
  exit 2
fi

exit 0