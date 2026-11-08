# Modelo 3D de la remera

## Qué se usa

`public/models/camiseta.glb`: remera + percha + gancho, el modelo de [sdhuesca.bellostas.studio](https://sdhuesca.bellostas.studio/) (Bellostas Studio, exportado de Blender). Es el modelo elegido para el proyecto.

**Licencia:** el GLB no trae licencia. El equipo decidió versionarlo y publicarlo con el sitio, con crédito a Bellostas Studio en el pie y en el README.

Si el archivo no está o no carga, `src/three/assets.js` usa una remera equivalente **generada por código** (`src/three/model/`), con el mismo layout UV, así el sitio nunca queda vacío.

## Contrato del modelo

`src/three/assets.js` busca tres mallas por prefijo de nombre:

| Malla | Uso | Atributos |
| --- | --- | --- |
| `camiseta*` | la remera | `POSITION`, `NORMAL`, `TEXCOORD_0`, `COLOR_0` (oclusión) |
| `percha*` | percha de madera | `POSITION`, `NORMAL` |
| `gancho*` | gancho de metal | `POSITION`, `NORMAL` |

- Metros. Origen donde el gancho apoya en el riel; la remera cuelga hacia −Y.
- La espalda mira a +Z (es lo que se ve en primer plano), el frente a −Z.
- UV en atlas frente | espalda: `u < 0.5` frente, `u > 0.5` espalda, cada mitad una proyección casi plana.

## Si cambia el modelo

1. Dejar el GLB nuevo en `public/models/camiseta.glb`.
2. `npm run uv:fit` y pegar los coeficientes `FRONT` / `BACK` en `src/three/kit/uvMap.js`.
3. Si cambia la forma del layout UV, revisar en `src/three/kit/kitSpec.js` las posiciones del cuello, vivos, puños y logos (`python3 scripts/uv_fit.py public/models/camiseta.glb --png uv.png` dibuja la malla sobre la plantilla).
4. `npm run gate` y mirarlo en `npm run dev`.

## La remera generada por código

`src/three/model/shirtGeometry.js` (puro, testeado) arma dos caras "infladas" desde una silueta propia (`silhouette.js`): triangulación de Delaunay, volumen según la distancia a las costuras (cuello, puños y bajo quedan abiertos y se ve el forro), pliegues hacia el bajo y oclusión en los colores de vértice. Las UV salen de la misma fórmula que la textura, así que se pinta igual que el GLB.
