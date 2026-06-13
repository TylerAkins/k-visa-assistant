#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXCLUDED=(
  "${ROOT_DIR}/lib/env.ts"
  "${ROOT_DIR}/lib/db/index.ts"
)

should_exclude() {
  local file="$1"
  for excluded in "${EXCLUDED[@]}"; do
    if [[ "$file" == "$excluded" ]]; then
      return 0
    fi
  done
  return 1
}

missing=0

while IFS= read -r file; do
  if should_exclude "$file"; then
    continue
  fi

  test_file="${file%.ts}.test.ts"
  if [[ ! -f "$test_file" ]]; then
    echo "error: missing test file for ${file#"${ROOT_DIR}/"}" >&2
    echo "       expected ${test_file#"${ROOT_DIR}/"}" >&2
    missing=1
  fi
done < <(find "${ROOT_DIR}/lib" "${ROOT_DIR}/features" -type f -name '*.ts' ! -name '*.test.ts' 2>/dev/null || true)

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "All required lib/ and features/ modules have test files."
