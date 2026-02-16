#!/usr/bin/env bash
set -euo pipefail

# Push an OpenClaw status JSON object into Firebase Realtime Database.
#
# Usage:
#   scripts/push-status.sh /path/to/status.json
#   cat /path/to/status.json | scripts/push-status.sh -
#
# Required env vars:
#   FIREBASE_DATABASE_URL  e.g. https://<db-name>.firebaseio.com
# Optional:
#   FIREBASE_AUTH          database secret OR auth token appended as ?auth=
#
# Writes:
#   /openpad/status       <- JSON payload
#   /openpad/lastUpdated  <- unix ms timestamp

INPUT="${1:-}"
if [[ -z "${INPUT}" ]]; then
  echo "Usage: $0 /path/to/status.json (or - for stdin)" >&2
  exit 1
fi

if [[ -z "${FIREBASE_DATABASE_URL:-}" ]]; then
  echo "Missing FIREBASE_DATABASE_URL" >&2
  exit 1
fi

AUTH_QS=""
if [[ -n "${FIREBASE_AUTH:-}" ]]; then
  AUTH_QS="?auth=${FIREBASE_AUTH}"
fi

TMP=""
if [[ "${INPUT}" == "-" ]]; then
  TMP="$(mktemp)"
  cat > "${TMP}"
  INPUT="${TMP}"
fi

TS_MS="$(date +%s%3N)"

# Put status
curl -fsS \
  -X PUT \
  -H 'Content-Type: application/json' \
  --data-binary "@${INPUT}" \
  "${FIREBASE_DATABASE_URL%/}/openpad/status.json${AUTH_QS}" \
  >/dev/null

# Put lastUpdated
curl -fsS \
  -X PUT \
  -H 'Content-Type: application/json' \
  --data-binary "${TS_MS}" \
  "${FIREBASE_DATABASE_URL%/}/openpad/lastUpdated.json${AUTH_QS}" \
  >/dev/null

if [[ -n "${TMP}" ]]; then
  rm -f "${TMP}"
fi

echo "Pushed status to Firebase (lastUpdated=${TS_MS})" >&2
