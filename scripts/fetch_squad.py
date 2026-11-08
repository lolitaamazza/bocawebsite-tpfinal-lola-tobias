#!/usr/bin/env python3
"""Plantel + estadísticas de Boca desde Transfermarkt, de forma determinística.

Genera:
  src/data/squad.json   una fila por jugador con dorsal (los que no tienen dorsal quedan fuera)
  src/data/stats.json   números del torneo en curso, por dorsal
  public/jugadores/<dorsal>.webp  retrato 300x390

Uso:
  python3 scripts/fetch_squad.py            # usa la caché de scripts/.cache si existe
  python3 scripts/fetch_squad.py --refresh  # vuelve a bajar todo

Sin dependencias fuera de la stdlib (más `cwebp` para los retratos).
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
DATA = ROOT / "src" / "data"
PORTRAITS = ROOT / "public" / "jugadores"

CLUB_ID = 189  # CA Boca Juniors en Transfermarkt
SEASON_ID = 2025  # Transfermarkt llama 2025 a la temporada argentina 2026
COMPETITION = {"id": "ARGC", "name": "Torneo Clausura 2026"}
BASE = "https://www.transfermarkt.es"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)

# Puesto de Transfermarkt -> (grupo, rol en criollo)
POSITIONS = {
    "Portero": ("ARQ", "Arquero"),
    "Defensa central": ("DEF", "Marcador central"),
    "Lateral izquierdo": ("DEF", "Lateral izquierdo"),
    "Lateral derecho": ("DEF", "Lateral derecho"),
    "Pivote": ("MED", "Volante central"),
    "Mediocentro": ("MED", "Volante mixto"),
    "Mediocentro ofensivo": ("MED", "Enganche"),
    "Mediapunta": ("MED", "Enganche"),
    "Interior izquierdo": ("MED", "Volante por izquierda"),
    "Interior derecho": ("MED", "Volante por derecha"),
    "Extremo izquierdo": ("MED", "Extremo izquierdo"),
    "Extremo derecho": ("MED", "Extremo derecho"),
    "Delantero centro": ("DEL", "Centrodelantero"),
    "Mediapunta ofensivo": ("DEL", "Segundo delantero"),
}

FLAGS = {
    "Argentina": "🇦🇷", "Uruguay": "🇺🇾", "Paraguay": "🇵🇾", "Chile": "🇨🇱",
    "Colombia": "🇨🇴", "Ecuador": "🇪🇨", "Perú": "🇵🇪", "Bolivia": "🇧🇴",
    "Venezuela": "🇻🇪", "Brasil": "🇧🇷", "Italia": "🇮🇹", "España": "🇪🇸",
}

# Procedencias de la casa, en el idioma del hincha
HOME_CLUBS = {
    "CA Boca Juniors II": "Reserva de Boca",
    "CA Boca Juniors U20": "Juveniles de Boca",
    "CA Boca Juniors Juvenil": "Juveniles de Boca",
}

# Nombre en la espalda cuando el apellido solo no alcanza
SHIRT_OVERRIDES: dict[int, str] = {}


def fetch(url: str, name: str, refresh: bool, binary: bool = False):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if path.exists() and not refresh:
        return path.read_bytes() if binary else path.read_text("utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-ES,es"})
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read()
    path.write_bytes(body)
    time.sleep(0.6)  # sin apuro: es un sitio de terceros
    return body if binary else body.decode("utf-8")


def text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def rows_of(page: str) -> list[str]:
    table = page[page.find('<table class="items">'):]
    table = table[: table.find("</tbody>")]
    return re.split(r'<tr class="(?:odd|even)">', table)[1:]


def num(value: str) -> int:
    value = value.replace("'", "").replace(".", "").strip()
    return int(value) if value.isdigit() else 0


def parse_squad(page: str) -> list[dict]:
    out = []
    for row in rows_of(page):
        dorsal = re.search(r"<div class=rn_nummer>([^<]*)</div>", row).group(1).strip()
        if not dorsal.isdigit():
            continue  # sin dorsal asignado (lesionado largo, a préstamo, etc.)
        full = html.unescape(re.search(r'title="([^"]+)" alt="[^"]*" class="bilderrahmen-fixed', row).group(1))
        tm_pos = text(re.findall(r"<td>([^<]+)</td>", row)[0])
        group, rol = POSITIONS[tm_pos]
        countries = [html.unescape(c) for c in re.findall(r'<img[^>]*title="([^"]+)"[^>]*class="flaggenrahmen"', row)]
        cells = [text(c) for c in re.findall(r'<td class="zentriert">(.*?)</td>', row, flags=re.S)]
        age = int(re.search(r"\((\d+)\)", cells[0]).group(1))
        contract = re.search(r"(\d{4})$", cells[-1])
        origin_titles = re.findall(r'<a title="([^"]+)" href="/[^"]*/startseite/verein/\d+', row)
        origin = html.unescape(origin_titles[-1]).split(":")[0].strip() if origin_titles else "CA Boca Juniors II"
        portrait = re.search(r'data-src="(https://img\.a\.transfermarkt\.technology/portrait/)medium/([^"?]+)', row)
        first, _, last = full.partition(" ")
        number = int(dorsal)
        out.append({
            "id": f"d{number}",
            "dorsal": number,
            "shirt": SHIRT_OVERRIDES.get(number, last.upper()),
            "nombre": first,
            "apellido": last,
            "pos": group,
            "rol": rol,
            "edad": age,
            "pais": countries[0],
            "bandera": FLAGS.get(countries[0], "🏳️"),
            "procedencia": HOME_CLUBS.get(origin, origin),
            "contrato": int(contract.group(1)) if contract else None,
            "capitan": "kapitaenicon" in row,
            "tm": int(re.search(r"/profil/spieler/(\d+)", row).group(1)),
            "portrait": portrait.group(1) + "big/" + portrait.group(2) if portrait else None,
        })
    order = {"ARQ": 0, "DEF": 1, "MED": 2, "DEL": 3}
    # Mismo orden que el original: por línea y, dentro de la línea, por el orden de Transfermarkt
    return sorted(out, key=lambda p: order[p["pos"]])


def parse_stats(page: str) -> dict[int, dict]:
    # Columnas (vista detallada): edad, nac., convocado, alineaciones, goles, asistencias,
    # amarillas, doble amarilla, rojas, entró, salió, ppp, minutos
    stats = {}
    for row in rows_of(page):
        dorsal = re.search(r"<div class=rn_nummer>([^<]*)</div>", row).group(1).strip()
        if not dorsal.isdigit():
            continue
        cells = [text(c) for c in re.findall(r'<td[^>]*class="(?:zentriert|rechts)[^"]*"[^>]*>(.*?)</td>', row, flags=re.S)]
        # cells[0]=dorsal, [1]=edad, [2]=nac (vacío), luego:
        # conv, pj, goles, asist, amarillas, doble amarilla, rojas, entró, salió, ppp, minutos
        c = cells[3:]
        pj, sub_on = num(c[1]), num(c[7])
        stats[int(dorsal)] = {
            "conv": num(c[0]), "pj": pj, "tit": max(0, pj - sub_on), "goles": num(c[2]),
            "asist": num(c[3]), "ta": num(c[4]), "tr": num(c[6]) + num(c[5]),
            "min": num(c[10]),
        }
    return stats


def save_portrait(player: dict, refresh: bool) -> None:
    target = PORTRAITS / f"{player['dorsal']}.webp"
    if target.exists() and not refresh or not player["portrait"]:
        return
    raw = fetch(player["portrait"], f"portrait-{player['tm']}.jpg", refresh, binary=True)
    PORTRAITS.mkdir(parents=True, exist_ok=True)
    tmp = CACHE / f"portrait-{player['tm']}.jpg"
    tmp.write_bytes(raw)
    subprocess.run(["cwebp", "-quiet", "-q", "82", str(tmp), "-o", str(target)], check=True)


def main() -> None:
    refresh = "--refresh" in sys.argv
    squad_page = fetch(f"{BASE}/ca-boca-juniors/kader/verein/{CLUB_ID}/saison_id/{SEASON_ID}/plus/1", "kader.html", refresh)
    stats_page = fetch(
        f"{BASE}/ca-boca-juniors/leistungsdaten/verein/{CLUB_ID}/plus/1?reldata={COMPETITION['id']}%26{SEASON_ID}",
        "stats.html", refresh,
    )
    squad = parse_squad(squad_page)
    stats = parse_stats(stats_page)
    # Goles en contra de cada arquero: Transfermarkt ya no los sirve en HTML plano
    # y FBref está detrás de Cloudflare, así que la ficha de arquero muestra "Convocado".
    for p in squad:
        save_portrait(p, refresh)
    for p in squad:
        p.pop("portrait")
    DATA.mkdir(parents=True, exist_ok=True)
    meta = {"source": "Transfermarkt", "competition": COMPETITION["name"], "fetched": time.strftime("%Y-%m-%d")}
    (DATA / "squad.json").write_text(json.dumps(squad, ensure_ascii=False, indent=1) + "\n", "utf-8")
    (DATA / "stats.json").write_text(
        json.dumps({"meta": meta, "players": {str(k): v for k, v in stats.items()}}, ensure_ascii=False, indent=1) + "\n",
        "utf-8",
    )
    groups = {g: sum(1 for p in squad if p["pos"] == g) for g in ("ARQ", "DEF", "MED", "DEL")}
    print(f"{len(squad)} jugadores {groups} · stats de {len(stats)} · capitán: "
          f"{[p['shirt'] for p in squad if p['capitan']]}")


if __name__ == "__main__":
    main()
