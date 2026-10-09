#!/usr/bin/env bash
#
# Bestimmt, wogegen `pnpm check:affected` vergleicht, und gibt genau eine
# Git-Referenz auf stdout aus.
#
#   1. AFFECTED_BASE, falls gesetzt. Das gewinnt immer.
#   2. origin/main, falls vorhanden UND ein Vorfahr des aktuellen Stands.
#      Dann bedeutet "geaendert": alles, was dieser Branch gegenueber main
#      angefasst hat. Das ist der Fall auf einem Arbeitsbranch.
#   3. Sonst HEAD. Verglichen wird dann der Arbeitsstand gegen den letzten
#      Commit, also genau das, was gerade offen ist.
#
# Punkt 3 ist kein Notnagel, sondern der Normalfall auf den Referenzbranches
# dieses Workshops: origin/main zeigt dort auf slow, und ein Vergleich gegen
# einen divergenten Branch waehlt immer alle Pakete aus - der Affected-Lauf
# waere dann ein voller Lauf mit Zusatzschritt.

set -euo pipefail

if [ -n "${AFFECTED_BASE:-}" ]; then
  printf '%s\n' "$AFFECTED_BASE"
  exit 0
fi

if git rev-parse --verify --quiet origin/main >/dev/null 2>&1 &&
  git merge-base --is-ancestor origin/main HEAD >/dev/null 2>&1; then
  printf 'origin/main\n'
  exit 0
fi

printf 'HEAD\n'
