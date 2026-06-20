#!/bin/bash
# Hook 4: Block console.log in src/engine/
# Fires on: Write, Edit, MultiEdit tool calls

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.path // empty')

if [[ "$FILE" != *"src/engine/"* ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.file_text // .tool_input.new_str // empty')

if echo "$CONTENT" | grep -qE "console\.(log|warn|error|info|debug)"; then
  echo "[INK LATENCY] console.log/warn/error detected in src/engine/." >&2
  echo "File: $FILE" >&2
  echo "Console calls in the hot-path ink engine add synchronous I/O on every pointer event." >&2
  echo "Use a conditional debug flag (e.g. if (DEBUG) ...) or remove entirely before committing." >&2
  exit 2
fi

exit 0
