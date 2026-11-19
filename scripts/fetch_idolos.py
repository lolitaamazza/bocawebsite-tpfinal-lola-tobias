#!/usr/bin/env python3
"""Fotos reales para el Salón de ídolos (/idolos), desde Wikimedia Commons.

Una foto por ídolo, elegida a mano en Commons (de su época en Boca cuando
existe) y SOLO con licencia libre: dominio público, CC BY o CC BY-SA. Si la
licencia que devuelve la API no está en la lista blanca, la foto se descarta y
el ídolo queda con su tarjeta tipográfica (no hay foto inventada).

Las fotos chicas no se agrandan: cwebp solo achica a 1400 px si hace falta, y
el ancho real queda en el JSON para que la página no las estire de más.

Genera:
  public/idolos/<slug>.webp
  src/data/idolos-fotos.json

Uso: python3 scripts/fetch_idolos.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# Reusa la consulta a la API y la limpieza de metadatos del script de Historia
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_historia import CACHE, ROOT, UA, api_info, clean  # noqa: E402

OUT_IMG = ROOT / "public" / "idolos"
OUT_JSON = ROOT / "src" / "data" / "idolos-fotos.json"
MAX_W = 1400

# Licencias libres aceptadas (las mismas que valida src/data/idolos.test.js)
ALLOWED = re.compile(r"^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z]{2})?)$")

# slug -> (archivo en Commons, epígrafe)
PHOTOS = {
    "maradona": ("Maradona boca 1981.jpg", "Tapa de El Gráfico: Maradona festeja en su debut con Boca, ante Talleres, 1981."),
    "riquelme": ("Riquelme boca vs espanyol 2011.jpg", "Riquelme con Boca ante el Espanyol, en Barcelona, 2011."),
    "palermo": ("Martín Palermo.jpg", "Palermo con Boca en la Audi Cup de Múnich, 2009."),
    "tevez": ("InddelVal-Boca (4).jpg", "Tevez ante Independiente del Valle, semifinal de la Libertadores 2016."),
    "rattin": ("Rattin waving crowd.jpg", "Rattín saluda a la tribuna con la camiseta de Boca."),
    "marzolini": ("Silvio Marzolini (Boca) - El Gráfico 2755.jpg", "Marzolini en la tapa de El Gráfico, julio de 1972."),
    "gatti": ("Hugo gatti boca.jpg", "Hugo Gatti en el arco de Boca, hacia 1977."),
    "rojas": ("Rojitas dribbling.jpg", "Rojitas gambetea en la Bombonera, década de 1960."),
    "varallo": ("Varallo boca portrait.jpg", "Varallo con la camiseta de Boca, hacia 1931."),
    "bianchi": ("Carlos Bianchi 2012.jpg", "Bianchi en la Legislatura porteña, diciembre de 2012."),
}


def tidy_author(artist: str) -> str:
    """Autor legible: sin la firma con fecha de Wikipedia ni el "from <ciudad>" de Flickr."""
    if not artist or "Unknown author" in artist:
        return "Autor desconocido"
    artist = re.sub(r"\s+\d{1,2}:\d{2}, .*$", "", artist)  # "Chivista 20:41, 30. Jul. 2009 (CEST)"
    artist = re.sub(r"\s+from\s+.*$", "", artist)  # "Gobierno de la Ciudad ... from Ciudad Autónoma ..."
    return artist.strip()[:80]


def fetch() -> dict:
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    info = api_info([t for t, _ in PHOTOS.values()])
    credits, skipped = {}, []
    for slug, (title, caption) in PHOTOS.items():
        ii = info.get(title)
        if not ii:
            skipped.append((slug, "no está en Commons"))
            continue
        m = ii["extmetadata"]
        license_ = clean(m.get("LicenseShortName", {}).get("value"))
        if not ALLOWED.match(license_):
            skipped.append((slug, f"licencia no libre: {license_}"))
            continue
        raw = CACHE / f"idolos-{slug}-{hashlib.sha1(title.encode()).hexdigest()[:10]}.jpg"
        if not raw.exists():
            raw.write_bytes(urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=60).read())
            time.sleep(1)
        target = OUT_IMG / f"{slug}.webp"
        width = min(ii["width"], MAX_W)
        height = round(ii["height"] * width / ii["width"])
        # solo achica: una foto de 400 px no se estira a 1400
        resize = ["-resize", str(MAX_W), "0"] if ii["width"] > MAX_W else []
        subprocess.run(["cwebp", "-quiet", "-q", "82", *resize, str(raw), "-o", str(target)], check=True)
        credits[slug] = {
            "src": f"/idolos/{slug}.webp",
            "width": width,
            "height": height,
            "caption": caption,
            "author": tidy_author(clean(m.get("Artist", {}).get("value"))),
            "license": license_,
            "date": clean(m.get("DateTimeOriginal", {}).get("value"))[:10],
            "page": ii["descriptionurl"],
        }
    OUT_JSON.write_text(json.dumps(credits, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(f"{len(credits)}/{len(PHOTOS)} fotos en public/idolos/ y créditos en {OUT_JSON.relative_to(ROOT)}")
    for slug, c in credits.items():
        print(f"  {slug:10} {c['width']}x{c['height']:<5} {c['license']:16} {c['author']}")
    for slug, why in skipped:
        print(f"  {slug:10} SIN FOTO ({why}): queda la tarjeta tipográfica")
    return credits


if __name__ == "__main__":
    fetch()
