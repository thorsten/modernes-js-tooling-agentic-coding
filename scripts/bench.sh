#!/usr/bin/env bash
#
# Misst die beiden Zahlen, um die es im Workshop geht:
#
#   Full-Check      kalt, also mit geleerten Caches. Das ist der CI-Fall und auf
#                   einem Branch ohne Inkrementalitaet auch der Alltagsfall.
#   Affected-Check  warm, nach einer Ein-Zeilen-Aenderung in packages/web. Das ist
#                   der innere Loop, in dem ein Agent tatsaechlich arbeitet.
#
# Jede Messung laeuft dreimal, ausgegeben wird der Median.
#
# Aufruf:  bash scripts/bench.sh  [-n LAEUFE]

set -euo pipefail

RUNS=3
while getopts "n:" opt; do
  case "$opt" in
    n) RUNS="$OPTARG" ;;
    *)
      echo "Aufruf: bash scripts/bench.sh [-n LAEUFE]" >&2
      exit 2
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------------------------------------------------------- Hilfsmittel

# Millisekunden portabel: macOS liefert kein date +%s%N, Node ist ohnehin Pflicht.
now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }

has_script() { node -e "process.exit(require('./package.json').scripts['$1'] ? 0 : 1)"; }

median() {
  printf '%s\n' "$@" | sort -n | awk '{ v[NR] = $1 } END {
    if (NR % 2) print v[(NR + 1) / 2]
    else printf "%.0f\n", (v[NR / 2] + v[NR / 2 + 1]) / 2
  }'
}

fmt() { awk -v ms="$1" 'BEGIN { printf "%.1f s", ms / 1000 }'; }

# ------------------------------------------------------- Branch-Erkennung

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unbekannt")"

if has_script check; then
  FULL_CMD="pnpm run check"
else
  FULL_CMD="pnpm run lint && pnpm run typecheck && pnpm run format:check && pnpm run test"
fi

if has_script check:affected; then
  AFFECTED_CMD="AFFECTED_BASE=HEAD pnpm run check:affected"
  AFFECTED_NOTE=""
else
  AFFECTED_CMD="$FULL_CMD"
  AFFECTED_NOTE="  (kein Affected-Lauf vorhanden, gemessen wird der volle Durchlauf)"
fi

# ----------------------------------------------------------------- Messen

clear_caches() {
  rm -rf packages/*/dist packages/*/*.tsbuildinfo packages/*/dist/.tsbuildinfo 2>/dev/null || true
  rm -rf node_modules/.vite packages/*/node_modules/.vite 2>/dev/null || true
  rm -rf node_modules/.cache packages/*/node_modules/.cache 2>/dev/null || true
  rm -rf .oxlintcache 2>/dev/null || true
  rm -rf "${TMPDIR:-/tmp}"/jest_* 2>/dev/null || true
}

DUMMY_FILE="packages/web/src/index.ts"
DUMMY_BACKUP="$(mktemp)"
DUMMY_SAVED=0

restore_dummy() {
  if [ "$DUMMY_SAVED" -eq 1 ]; then
    cp "$DUMMY_BACKUP" "$DUMMY_FILE"
  fi
}
cleanup() {
  restore_dummy
  rm -f "$DUMMY_BACKUP"
}
trap cleanup EXIT

run_once() {
  local start end
  start="$(now_ms)"
  if ! eval "$1" >/dev/null 2>&1; then
    echo "FEHLER: Der Lauf war rot. Bitte '$1' von Hand ausfuehren." >&2
    exit 1
  fi
  end="$(now_ms)"
  echo $((end - start))
}

echo "Branch:         $BRANCH"
echo "Full-Check:     $FULL_CMD"
echo "Affected-Check: $AFFECTED_CMD$AFFECTED_NOTE"
echo "Laeufe:         $RUNS (Median)"
echo

full_times=()
echo -n "Full-Check (kalt)     "
for _ in $(seq 1 "$RUNS"); do
  clear_caches
  ms="$(run_once "$FULL_CMD")"
  full_times+=("$ms")
  echo -n "."
done
echo " $(fmt "$(median "${full_times[@]}")")"

# Warmlauf, damit der Affected-Check auf gefuellte Caches trifft.
eval "$FULL_CMD" >/dev/null 2>&1

cp "$DUMMY_FILE" "$DUMMY_BACKUP"
DUMMY_SAVED=1

affected_times=()
echo -n "Affected-Check (warm) "
for i in $(seq 1 "$RUNS"); do
  restore_dummy
  printf '\n// bench: Aenderung %s\n' "$i" >>"$DUMMY_FILE"
  ms="$(run_once "$AFFECTED_CMD")"
  affected_times+=("$ms")
  echo -n "."
done
restore_dummy
echo " $(fmt "$(median "${affected_times[@]}")")"

echo
echo "Rohwerte in ms"
echo "  Full:     ${full_times[*]}"
echo "  Affected: ${affected_times[*]}"
