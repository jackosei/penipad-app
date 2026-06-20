#!/bin/bash
# Hook 2: Block raw Dexie calls outside src/db/queries.ts
# Fires on: Write, Edit, MultiEdit tool calls

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.path // empty')

# Allow queries.ts itself
if [[ "$FILE" == *"src/db/queries.ts" ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.file_text // .tool_input.new_str // empty')

# Check for raw Dexie usage patterns
if echo "$CONTENT" | grep -qE "new Dexie\(|\.table\(|from ['\"]dexie['\"]"; then
  echo "[ARCH VIOLATION] Raw Dexie calls are only allowed in src/db/queries.ts." >&2
  echo "File: $FILE" >&2
  echo "All IndexedDB reads/writes must go through the single Dexie call boundary in src/db/queries.ts." >&2
  echo "Export a query function from queries.ts and call that instead." >&2
  exit 2
fi

exit 0
