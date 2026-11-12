import * as THREE from 'three'
import { camisetas } from '@/data/cronologia'
import { loadSceneAssets } from '@/three/assets'
import { createShirtGeometry } from '@/three/model/shirtModel'
import { TEMPLATE_H, TEMPLATE_W } from '@/three/kit/uvMap'
import { archiveMarks, extractMark } from './archiveMarks'
import { longSleeve } from './longSleeve'
import { paintHistoricShirt } from './paintShirt'

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image.decode().then(() => image)
}

export async function loadHistoricRail() {
  const [assets, kits] = await Promise.all([
    loadSceneAssets(),
    Promise.all(camisetas.map(async (item) => {
      const marks = archiveMarks[item.id] ?? []
      const image = marks.length ? await loadImage(item.image) : null
      const stamps = marks.map((mark) => ({ image: extractMark(image, mark), target: mark.target }))
      return [item.id, { diseño: item.diseño, stamps }]
    })),
  ])
  const byId = new Map(kits)
  const long = createShirtGeometry(longSleeve)
  return {
    ...assets,
    geometryFor: (player) => byId.get(player.id).diseño.longSleeves ? long : assets.shirt,
    makeTexture: (_, player, scale, anisotropy) => {
      const { diseño, stamps } = byId.get(player.id)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(TEMPLATE_W * 2 * scale)
      canvas.height = Math.round(TEMPLATE_H * scale)
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      paintHistoricShirt(ctx, diseño, stamps, player.id === '2025' ? assets.brand : null)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false
      tex.anisotropy = anisotropy
      return tex
    },
    dispose() {
      long.dispose()
      assets.shirt.dispose()
      assets.hanger.dispose()
      assets.hook.dispose()
    },
  }
}
