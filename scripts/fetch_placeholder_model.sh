#!/usr/bin/env bash
# Baja el modelo de remera de sdhuesca.bellostas.studio SOLO para desarrollo local.
# Es obra de Bellostas Studio y no tiene licencia: no se commitea (está en .gitignore)
# y hay que reemplazarlo por un modelo propio antes de publicar. Ver docs/MODELO-3D.md.
set -euo pipefail
cd "$(dirname "$0")/.."
target="public/models/camiseta.glb"
if [[ -f "$target" ]]; then
  echo "Ya existe $target"
  exit 0
fi
mkdir -p public/models
curl -fsSL -A "Mozilla/5.0" "https://sdhuesca.bellostas.studio/models/camiseta-campo.glb" -o "$target"
echo "Placeholder en $target ($(wc -c < "$target" | tr -d ' ') bytes). No publicar con este modelo."
