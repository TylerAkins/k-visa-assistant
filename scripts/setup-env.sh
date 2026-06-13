#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_NAME="local"
FORCE=false

usage() {
  echo "usage: $0 [--env local|dev|prod] [--force]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --env)
      if [[ $# -lt 2 ]]; then
        echo "error: --env requires a value (local, dev, or prod)" >&2
        usage
        exit 1
      fi
      ENV_NAME="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

case "$ENV_NAME" in
  local)
    ENV_EXAMPLE="${ROOT_DIR}/.env.example"
  ;;
  dev)
    ENV_EXAMPLE="${ROOT_DIR}/.env.dev.example"
  ;;
  prod)
    ENV_EXAMPLE="${ROOT_DIR}/.env.prod.example"
  ;;
  *)
    echo "error: --env must be one of: local, dev, prod" >&2
    exit 1
  ;;
esac

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  echo "error: template not found at ${ENV_EXAMPLE}" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" && "$FORCE" != "true" ]]; then
  echo "error: .env already exists. Use --force to overwrite." >&2
  exit 1
fi

cp "$ENV_EXAMPLE" "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "Created ${ENV_FILE} for APP_ENV=${ENV_NAME} with permissions 600"
echo ""

if [[ "$ENV_NAME" == "local" ]]; then
  echo "Next steps:"
  echo "  docker-compose up -d --wait"
  echo "  pnpm db:migrate"
  echo "  pnpm dev"
else
  echo "Next steps:"
  echo "  1. Edit .env and replace placeholder DATABASE_URL / APP_URL values"
  if [[ "$ENV_NAME" == "dev" ]]; then
    echo "  2. Set DEV_ALLOWED_CIDRS if you want IP-restricted dev access"
  fi
  echo "  3. pnpm db:migrate"
  echo "  4. pnpm build && pnpm start"
fi
