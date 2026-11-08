#!/usr/bin/env python3
"""Chequeo periódico: ¿el plantel publicado sigue igual que el de Transfermarkt?

Baja la página del plantel en vivo (sin caché) y la compara con src/data/squad.json.
Sale con código 1 si hay altas, bajas o cambios de dorsal/puesto, y los lista.
No toca ningún archivo: para actualizar, `npm run data -- --refresh`.

Uso:  python3 scripts/squad_drift.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_squad as fs  # noqa: E402


def live_squad() -> list[dict]:
    url = f"{fs.BASE}/ca-boca-juniors/kader/verein/{fs.CLUB_ID}/saison_id/{fs.SEASON_ID}/plus/1"
    req = urllib.request.Request(url, headers={"User-Agent": fs.UA, "Accept-Language": "es-ES,es"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return fs.parse_squad(res.read().decode("utf-8"))


def main() -> int:
    published = {p["tm"]: p for p in json.loads((fs.DATA / "squad.json").read_text("utf-8"))}
    live = {p["tm"]: p for p in live_squad()}
    changes = []
    for tm in live.keys() - published.keys():
        p = live[tm]
        changes.append(f"+ alta: {p['dorsal']} {p['nombre']} {p['apellido']}")
    for tm in published.keys() - live.keys():
        p = published[tm]
        changes.append(f"- baja: {p['dorsal']} {p['nombre']} {p['apellido']}")
    for tm in live.keys() & published.keys():
        a, b = published[tm], live[tm]
        for k in ("dorsal", "pos", "capitan", "contrato"):
            if a[k] != b[k]:
                changes.append(f"~ {a['apellido']}: {k} {a[k]} -> {b[k]}")
    if changes:
        print(f"Plantel desactualizado ({len(changes)} cambios):")
        print("\n".join(sorted(changes)))
        return 1
    print(f"Plantel al día: {len(live)} jugadores con dorsal coinciden con Transfermarkt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
