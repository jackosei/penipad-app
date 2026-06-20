#!/bin/bash
# Hook 6+7: Block direct git commits; generate a conventional commit draft for Jack to review
# Fires on: Bash tool calls

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Detect git commit attempts (but not git commit --amend --no-edit etc used internally)
if echo "$COMMAND" | grep -qE "^git commit"; then

  # Extract -m message if present, for format checking
  MESSAGE=$(echo "$COMMAND" | grep -oP '(?<=-m )["\x27].*?["\x27]' | tr -d '"' | tr -d "'")

  echo "" >&2
  echo "╔══════════════════════════════════════════════════════════════╗" >&2
  echo "║  COMMIT BLOCKED — manual commit required (per CLAUDE.md)    ║" >&2
  echo "╚══════════════════════════════════════════════════════════════╝" >&2
  echo "" >&2

  if [[ -n "$MESSAGE" ]]; then
    # Check conventional commit format
    if echo "$MESSAGE" | grep -qE "^(feat|fix|perf|chore|test|docs)(\(.+\))?: .+"; then
      echo "✓ Format looks good. Proposed commit message:" >&2
      echo "" >&2
      echo "  $MESSAGE" >&2
      echo "" >&2
      echo "Run this yourself to commit:" >&2
      echo "" >&2
      echo "  git commit -m \"$MESSAGE\"" >&2
    else
      echo "⚠ The proposed message doesn't follow conventional commits." >&2
      echo "" >&2
      echo "  Proposed: $MESSAGE" >&2
      echo "" >&2
      echo "  Required format: <type>(<scope>): <description>" >&2
      echo "  Types: feat | fix | perf | chore | test | docs" >&2
      echo "" >&2
      echo "  Example fixes:" >&2

      # Try to suggest the right type based on common words
      if echo "$MESSAGE" | grep -qiE "add|implement|create|build|new"; then
        echo "    feat: $MESSAGE" >&2
      elif echo "$MESSAGE" | grep -qiE "fix|bug|broken|correct|resolve"; then
        echo "    fix: $MESSAGE" >&2
      elif echo "$MESSAGE" | grep -qiE "test|spec|coverage"; then
        echo "    test: $MESSAGE" >&2
      elif echo "$MESSAGE" | grep -qiE "perf|latency|speed|optim|fast"; then
        echo "    perf: $MESSAGE" >&2
      elif echo "$MESSAGE" | grep -qiE "doc|readme|comment|jsdoc"; then
        echo "    docs: $MESSAGE" >&2
      else
        echo "    chore: $MESSAGE" >&2
      fi

      echo "" >&2
      echo "Revise the message and run git commit manually." >&2
    fi
  else
    echo "No -m message found in: $COMMAND" >&2
    echo "" >&2
    echo "Please run git commit manually with a conventional commit message:" >&2
    echo "  git commit -m \"<type>(<scope>): <description>\"" >&2
    echo "  Types: feat | fix | perf | chore | test | docs" >&2
  fi

  echo "" >&2
  exit 2
fi

exit 0
