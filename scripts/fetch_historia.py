#!/usr/bin/env python3
"""Fotos reales de época para la sección Historia, desde Wikimedia Commons.

Cada pieza del museo (src/app/museo/piezas.js) lleva una foto de ambiente:
partidos, planteles, la hinchada o la Bombonera. Este script baja cada archivo,
lo pasa a webp (1400 px de ancho máximo) y escribe los créditos que piden las
licencias (autor, licencia, fecha, link a la ficha).

Genera:
  public/historia/<id>.webp
  src/data/historia-fotos.json

Uso: python3 scripts/fetch_historia.py
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / "public" / "historia"
OUT_JSON = ROOT / "src" / "data" / "historia-fotos.json"
CACHE = ROOT / "scripts" / ".cache" / "historia"
UA = {"User-Agent": "BocaVestuarioTP/1.0 (https://boca-vestuario.vercel.app; trabajo práctico educativo)"}

# id de pieza -> (archivo en Commons, epígrafe)
PHOTOS = {
    "1905": ("Club Atlético Boca Juniors sweedish color.jpg", "Mural en La Boca: el barco sueco que, según la tradición, le dio los colores al club."),
    "1908": ("Boca vs river 1913.jpg", "Boca y River antes de un partido en 1913."),
    "1916": ("Bocajuniors-primercampeonato-1919.jpg", "El plantel del primer campeonato, 1919."),
    "1940": ("Inauguracion bombonera 1940.jpg", "Inauguración de la Bombonera, 25 de mayo de 1940."),
    "1954": ("Bocacampeon1954.jpg", "Boca campeón de 1954."),
    "1965": ("Rattin celebra v river.jpg", "Rattín festeja frente a River, 1965."),
    "1972": ("Trobbiani boca.jpg", "Marcelo Trobbiani con la azul y oro, hacia 1973."),
    "1980": ("Maradona boca 1981.jpg", "Maradona en la tapa de El Gráfico, 1981."),
    "1992": ("Bombonera (4391140500).jpg", "La Bombonera llena (foto de 2009)."),
    "1996": ("Hinchada de Boca desplegando sus telones.JPG", "La hinchada despliega sus telones (foto de 2009)."),
    "2000": ("Bombonera (4391138544).jpg", "El jugador número 12 (foto de 2009)."),
    "2007": ("Boca Juniors match.jpg", "La tribuna en un partido de 2004."),
    "2011": ("Riquelme boca vs espanyol 2011.jpg", "Riquelme en Barcelona, 2011."),
    "2018": ("Libertadores de Boca exhibida en el Dardo Rocha 01.jpg", "La Copa Libertadores, con los años de Boca grabados."),
    "2020": ("Boca hinchada bombonera.jpg", "La hinchada detrás del alambrado, 2015."),
    "2025": ("PALMEIRAS X BOCA JUNIORS - COPA LIBERTADORES 2023 (53286672023) (cropped).jpg", "Advíncula en la semifinal de la Libertadores 2023."),
    "2026": ('Vista aérea del Estadio Alberto J. Armando "La Bombonera" 08.jpg', "La Bombonera desde el aire, 2025."),
}

clean = lambda s: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(s or ""))).strip()


def api_info(titles: list[str]) -> dict:
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
        "&iiprop=url|size|extmetadata&iiurlwidth=1400&titles=" + urllib.parse.quote("|".join("File:" + t for t in titles))
    )
    d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
    norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
    out = {}
    for p in d["query"]["pages"].values():
        if "imageinfo" in p:
            out[norm.get(p["title"], p["title"]).replace("File:", "")] = p["imageinfo"][0]
    return out


def main() -> None:
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    info = api_info([t for t, _ in PHOTOS.values()])
    credits = {}
    for pid, (title, caption) in PHOTOS.items():
        ii = info.get(title)
        if not ii:
            raise SystemExit(f"No encontré {title} en Commons")
        m = ii["extmetadata"]
        raw = CACHE / f"{pid}.jpg"
        if not raw.exists():
            raw.write_bytes(urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=60).read())
            time.sleep(1)
        target = OUT_IMG / f"{pid}.webp"
        subprocess.run(["cwebp", "-quiet", "-q", "80", "-resize", "1400", "0", str(raw), "-o", str(target)], check=True)
        artist = clean(m.get("Artist", {}).get("value")) or "Autor desconocido"
        credits[pid] = {
            "src": f"/historia/{pid}.webp",
            "width": min(ii["width"], 1400),
            "height": round(ii["height"] * min(1, 1400 / ii["width"])),
            "caption": caption,
            "author": "Autor desconocido" if "Unknown author" in artist else artist[:80],
            "license": clean(m.get("LicenseShortName", {}).get("value")),
            "date": clean(m.get("DateTimeOriginal", {}).get("value"))[:10],
            "page": ii["descriptionurl"],
        }
    OUT_JSON.write_text(json.dumps(credits, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(f"{len(credits)} fotos en public/historia/ y créditos en {OUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
