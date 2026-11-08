# Modelo 3D de la remera

## Estado actual

`public/models/camiseta.glb` es el modelo de [sdhuesca.bellostas.studio](https://sdhuesca.bellostas.studio/) (Bellostas Studio, exportado de Blender). Se usa **solo como placeholder para desarrollo local**: no tiene licencia, no está en git y no se publica con él. `npm run model:placeholder` lo baja.

## Qué tiene que tener el modelo propio

El código (`src/three/assets.ts`) busca tres mallas por prefijo de nombre:

| Malla | Uso | Atributos |
| --- | --- | --- |
| `camiseta*` | la remera | `POSITION`, `NORMAL`, `TEXCOORD_0`, `COLOR_0` (oclusión horneada, opcional pero suma mucho) |
| `percha*` | la percha de madera | `POSITION`, `NORMAL` |
| `gancho*` | el gancho de metal | `POSITION`, `NORMAL` |

Convenciones del placeholder, que conviene respetar:

- Metros. Origen en el punto donde el gancho apoya en el riel; la remera cuelga hacia −Y (≈ 0,77 m de largo, ≈ 0,59 m de ancho con mangas).
- La espalda mira a +Z (es lo que se ve en primer plano), el frente a −Z.
- **UV en atlas frente | espalda**: `u < 0.5` frente, `u > 0.5` espalda, cada mitad una proyección casi plana de su cara. Islas extra (mangas) pueden ir en los costados de la mitad del frente.
- Sin materiales: los pone el código.

## Cambiarlo

1. Exportar el GLB con esas mallas y dejarlo en `public/models/camiseta.glb`.
2. `npm run uv:fit` y pegar los dos coeficientes `FRONT` / `BACK` que imprime en `src/three/kit/uvMap.ts`.
3. Si el layout UV cambia de forma (no solo de escala), revisar en `src/three/kit/kitSpec.ts` las posiciones en px de plantilla del cuello, los vivos, los puños y los logos. `python3 scripts/uv_fit.py public/models/camiseta.glb --png uv.png` dibuja la malla sobre la plantilla de 1600 × 1035 para ubicarlos.
4. `npm run gate` y mirarlo en `npm run dev` (frente: tocá la remera en primer plano para darla vuelta).
5. Sacar `public/models/camiseta.glb` del `.gitignore` y commitear el modelo propio.

## Opciones para conseguirlo

- Modelarlo en Blender (cloth sim sobre una percha, retopo, UV por proyección frente/espalda). Es lo que da el mismo nivel que el original.
- Partir de una remera CC0/CC-BY (Sketchfab, Poly Pizza), rehacer las UV como atlas frente | espalda y agregar percha y gancho.
