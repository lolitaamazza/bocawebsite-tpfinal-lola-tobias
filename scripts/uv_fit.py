#!/usr/bin/env python3
"""Coeficientes de src/three/kit/uvMap.ts a partir de un GLB de remera.

El atlas de la remera es frente (u < 0.5) | espalda (u > 0.5), cada mitad una
proyección casi plana. Este script ajusta por mínimos cuadrados
    u = a·x + b·y + c      v = d·x + e·y + f
sobre los vértices de la isla principal de cada cara (deja afuera las islas
sueltas de las mangas) e imprime el bloque listo para pegar.

Uso:  python3 scripts/uv_fit.py public/models/camiseta.glb [--png uv.png]
Requiere numpy (y Pillow para --png).
"""

from __future__ import annotations

import json
import struct
import sys

import numpy as np


def read_glb(path: str):
    data = open(path, "rb").read()
    jlen = struct.unpack("<I", data[12:16])[0]
    gltf = json.loads(data[20 : 20 + jlen])
    bin_off = 20 + jlen + 8

    def accessor(i: int):
        a = gltf["accessors"][i]
        bv = gltf["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a["componentType"]]
        off = bin_off + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        arr = np.frombuffer(data, dtype=dt, count=a["count"] * n, offset=off)
        return arr.reshape(a["count"], n) if n > 1 else arr

    mesh = next(m for m in gltf["meshes"] if m["name"].startswith("camiseta"))
    prim = mesh["primitives"][0]
    return accessor(prim["attributes"]["POSITION"]), accessor(prim["attributes"]["TEXCOORD_0"]), accessor(prim["indices"])


def fit(pos, uv, mask):
    X = np.c_[pos[mask][:, 0], pos[mask][:, 1], np.ones(mask.sum())]
    cu = np.linalg.lstsq(X, uv[mask][:, 0], rcond=None)[0]
    cv = np.linalg.lstsq(X, uv[mask][:, 1], rcond=None)[0]
    err = max(np.percentile(np.abs(X @ cu - uv[mask][:, 0]), 95), np.percentile(np.abs(X @ cv - uv[mask][:, 1]), 95))
    return cu, cv, err


def main():
    path = sys.argv[1]
    pos, uv, idx = read_glb(path)
    u, v = uv[:, 0], uv[:, 1]
    # Islas sueltas de las mangas: columnas angostas a los costados de la mitad del frente, abajo
    sleeves = (v > 0.45) & ((u < 0.075) | ((u > 0.425) & (u < 0.5)))
    front = (u < 0.5) & ~sleeves
    back = u > 0.5
    out = []
    for name, mask in (("FRONT", front), ("BACK", back)):
        cu, cv, err = fit(pos, uv, mask)
        out.append(f"const {name} = {{ u: [{cu[0]:.8f}, {cu[1]:.8f}, {cu[2]:.8f}], v: [{cv[0]:.8f}, {cv[1]:.8f}, {cv[2]:.8f}] }}")
        print(f"// {name.lower()}: {mask.sum()} vértices, error p95 {err * 100:.2f} % del atlas", file=sys.stderr)
    print("\n".join(out))

    if "--png" in sys.argv:
        from PIL import Image, ImageDraw

        W, H = 1600, 1035
        img = Image.new("RGB", (W, H), (20, 20, 20))
        draw = ImageDraw.Draw(img)
        for t in idx.reshape(-1, 3):
            draw.polygon([(uv[k][0] * W, uv[k][1] * H) for k in t], outline=(240, 192, 87) if uv[t[0]][0] < 0.5 else (80, 140, 240))
        img.save(sys.argv[sys.argv.index("--png") + 1])


if __name__ == "__main__":
    main()
