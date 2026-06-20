#!/bin/bash
# Hook 1: Block React imports in src/engine/
# Fires on: Write, Edit, MultiEdit tool calls

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.path // empty')

# Only check files inside src/engine/
if [[ "$FILE" != *"src/engine/"* ]]; then
  exit 0
fi

# Get the content being written
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.file_text // .tool_input.new_str // empty')

if echo "$CONTENT" | grep -qE "from ['\"]react['\"]|from ['\"]react/"; then
  echo "[ARCH VIOLATION] src/engine/ is framework-agnostic — React imports are not allowed here." >&2
  echo "The engine must have zero React dependencies so it can be tested in isolation, benchmarked without a DOM, and wrapped in a Capacitor native bridge." >&2
  echo "Move React-dependent code to src/hooks/ or src/components/ and call the engine from there." >&2
  exit 2
fi

exit 0
