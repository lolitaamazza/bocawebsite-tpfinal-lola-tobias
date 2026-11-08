import * as THREE from 'three'
/**
 * Normal map de tejido de punto: costillas verticales finas con un leve
 * ondulado, generado en un DataTexture de 128² que se repite sobre la remera.
 */
export function createKnitNormal(size = 128, repeat = [64, 42]) {
  const data = new Uint8Array(size * size * 4)
  const height = (x, y) => {
    const u = (x / size) * Math.PI * 2
    const v = (y / size) * Math.PI * 2
    // dos columnas de punto por tile, cada una con "eslabones" en V
    return 0.5 + 0.35 * Math.cos(u * 8) * Math.cos(v * 8 + Math.sin(u * 8) * 0.9) + 0.15 * Math.cos(u * 16)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * 2.4
      const dy = (height(x, y + 1) - height(x, y - 1)) * 2.4
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = (-dx / len) * 127 + 128
      data[i + 1] = (-dy / len) * 127 + 128
      data[i + 2] = (1 / len) * 127 + 128
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(...repeat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}
