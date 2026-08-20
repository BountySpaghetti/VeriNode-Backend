#!/bin/bash
set -e
export TS_NODE_TRANSPILE_ONLY=true

for file in $(find tests -name '*.test.ts'); do
  echo "Running $file"
  if grep -q "vitest" "$file"; then
    npx vitest run "$file"
  else
    npx ts-node --project tsconfig.json "$file"
  fi
done
