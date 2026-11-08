# El vestuario de Boca en 3D

Recorré la percha del vestuario: la titular 2026 de Boca Juniors en 3D, una remera por jugador del plantel, con ficha, buscador, filtros por línea y personalizador. Tributo no oficial, sin afiliación con Boca Juniors ni la AFA.

Recreación de [sdhuesca.bellostas.studio](https://sdhuesca.bellostas.studio/) (Bellostas Studio) para Boca: misma experiencia, código propio en React.

**Antes de publicar:** el modelo 3D de la remera es un placeholder de Bellostas Studio y no está en el repo. Ver [docs/MODELO-3D.md](docs/MODELO-3D.md).

## Correrlo

```bash
npm install
npm run model:placeholder   # baja el GLB placeholder (solo uso local)
npm run dev                 # http://localhost:4950
```

| Comando | Qué hace |
| --- | --- |
| `npm run gate` | tests + typecheck + build (lo que tiene que estar verde para commitear) |
| `npm test` | 50 tests determinísticos, < 1 s. También corre en el pre-commit |
| `npm run eval` | chequeo periódico: compara el plantel publicado con Transfermarkt en vivo |
| `npm run data` | regenera `src/data/*.json` y los retratos (`-- --refresh` para no usar caché) |
| `npm run uv:fit` | recalcula los coeficientes UV si cambia el modelo |

## Qué hace

- **Riel 3D** con 30 remeras (las del plantel con dorsal), agrupadas en Arqueros, Defensores, Mediocampistas y Delanteros. Se arrastra, tiene inercia, rebote en los bordes y cada percha se balancea con la aceleración.
- **Hover**: la remera se adelanta y gira, las vecinas le hacen lugar y aparece el epígrafe. En táctil, la del centro.
- **Ficha** (`/dorsal/5/`): la remera pasa a primer plano (se gira arrastrando; un toque la da vuelta), con retrato, números del Torneo Clausura 2026 y datos. Anterior/siguiente, compartir, gestos en móvil.
- **Personalizador** (`/personaliza/?nombre=TOBI&dorsal=10`): estampa nombre y número en vivo. El botón lleva a la titular en BocaShop (no acepta estampado por URL).
- **Buscador** por nombre o dorsal (`/` lo abre), filtros, teclado (← → Enter Esc), atrás/adelante del navegador.
- **Intro** de cámara con GSAP, telón de carga, cinta corrida, sonido ambiente sintetizado (WebAudio).
- Sin WebGL: lista accesible del plantel.

## Estructura

```
src/
  app/              App (una sola pantalla)
  containers/       Componentes conectados al estado: Vestuario, Header, Card
  components/
    three/          Stage (Canvas R3F) y Scene (arma la escena, conecta el store)
    layout/         Header, Footer, Ticker, Loader, Fallback
    card/           CardShell (anim. GSAP), PlayerCard, Customizer
    overlay/        GroupLabels, Caption, Toast (siguen a la escena por frame)
    search/         SearchPanel
    ui/             Icon, IconButton, Pill, StatTile
  engine/           Lógica pura y testeada: riel, péndulo, pose en primer plano, rutas, texto
  three/            Escena imperativa: RailRig, Jersey, vestuario, chapitas, material de tela
    kit/            La remera como datos (kitSpec), mapa UV, pintado del atlas, logos
  store/            Estado de UI (zustand)
  hooks/            Rutas, teclado, sonido, hueco libre para la remera, compartir
  config/site.ts    Todo lo "de Boca": textos, colores del vestuario, tienda, tipografías
  data/             squad.json + stats.json (generados por scripts/fetch_squad.py)
  styles/index.css  Tailwind v4: tokens (@theme) y utilidades propias
scripts/            Datos, drift del plantel, ajuste UV, placeholder del modelo
public/brand/       SVG oficiales (bocajuniors.com.ar): escudo, adidas, Betsson, Cetrogar
public/jugadores/   Retratos 300×390 (Transfermarkt)
```

La UI es React; la escena 3D es un `RailRig` imperativo (30 remeras animadas por frame no pasan por React). Se hablan por el store (filtro, selección, hover) y por `frameBus` (posiciones de rótulos y epígrafe, 60 veces por segundo, directo al DOM).

## La remera

No usa fotos: se pinta en un canvas a la resolución que haga falta (`src/three/kit/`). El atlas es frente | espalda sobre el layout UV del modelo, y `uvMap.ts` traduce alturas reales del modelo a filas de la textura, para que la franja coincida en los costados. Colores medidos sobre las fotos de referencia. Cada remera usa una textura liviana en el riel, otra más nítida al pasar el puntero y la grande en primer plano (como mucho 3 en alta a la vez).

Tipografía de nombre y número: **Chakra Petch** (provisoria). Se cambia en `fonts.lettering` de `src/config/site.ts`; las medidas del estampado están en `kit.lettering` de `kitSpec.ts`.

## Datos

`scripts/fetch_squad.py` lee el plantel detallado y los datos de rendimiento del Torneo Clausura 2026 de Transfermarkt (stdlib, con caché en `scripts/.cache`). Quedan afuera los jugadores sin dorsal asignado. Los arqueros muestran "Convocado" en lugar de goles en contra porque Transfermarkt ya no sirve ese dato en HTML plano.

## Assets y licencias

- Escudo y logos de sponsors: SVG del sitio oficial del club, usados como tributo.
- Retratos: Transfermarkt.
- Modelo 3D: placeholder de Bellostas Studio, fuera del repo, a reemplazar.
- Tipografías: Anton, Archivo, JetBrains Mono y Chakra Petch vía Fontsource (OFL).

## Deploy

`vercel.json` reescribe `/dorsal/*` y `/personaliza` a la SPA. El build en Vercel falla mientras no haya un modelo propio en `public/models/camiseta.glb`, a propósito.
