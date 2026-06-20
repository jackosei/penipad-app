#!/bin/bash
# Hook 3: Warn on bare TypeScript `any` without a suppression comment
# Fires on: Write, Edit, MultiEdit tool calls

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.path // empty')

# Only check TypeScript files
if [[ "$FILE" != *.ts && "$FILE" != *.tsx ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.file_text // .tool_input.new_str // empty')

# Find lines with `: any` not preceded by a suppression comment
# We check if the file has bare `: any` usage without an eslint-disable or explicit comment
VIOLATIONS=$(echo "$CONTENT" | grep -n ": any" | grep -v "// " | grep -v "eslint-disable")

if [[ -n "$VIOLATIONS" ]]; then
  echo "[TS WARNING] Bare \`: any\` found in $FILE without a suppression comment." >&2
  echo "Lines:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Per CLAUDE.md: No \`any\` without a comment explaining why. Add a comment on the line above:" >&2
  echo "  // any: <reason why a specific type isn't possible here>" >&2
  echo "" >&2
  echo "Proceeding, but this must be resolved before the PR merges." >&2
  # exit 1 = warn but allow (PostToolUse hooks use this to surface warnings)
fi

exit 0
