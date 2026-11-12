import { OUTLINE } from '@/three/model/silhouette'

// Alarga los puños de la misma malla hacia el bajo, sin tocar cuello ni torso.
export const longSleeve = OUTLINE.map((section, i) => {
  if (![0, 1, 2, 4, 5, 6].includes(i)) return section
  const left = i < 3
  const outer = left ? [63, 855] : [759, 861]
  const inner = left ? [148, 865] : [673, 873]
  if (i === 1 || i === 5) return { ...section, pts: left ? [outer, inner] : [inner, outer] }
  if (i === 0) return { ...section, pts: [...section.pts.slice(0, -1), [57, 600], outer] }
  if (i === 6) return { ...section, pts: [outer, [761, 600], ...section.pts.slice(1)] }
  if (i === 2) return { ...section, pts: [inner, [175, 650], ...section.pts] }
  return { ...section, pts: [...section.pts, [629, 650], inner] }
})
