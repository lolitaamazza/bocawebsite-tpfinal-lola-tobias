import { kit } from '@/three/kit/kitSpec'
import { TEMPLATE_H, TEMPLATE_W, rowAt } from '@/three/kit/uvMap'
import { BACK_NECK, OUTLINE } from '@/three/model/silhouette'

function stroke(ctx, points, color, width) {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function fit(ctx, image, x, y, width) {
  const height = width * image.naturalHeight / image.naturalWidth
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height)
}

function collar(ctx, diseño, side) {
  const { body, accent, collar: type } = diseño
  if (!type) return
  const neck = side === 'front' ? OUTLINE.at(-1).pts : BACK_NECK
  if (type === 'gold' || type === 'dark') {
    stroke(ctx, neck, body, 59)
    stroke(ctx, neck, accent, type === 'dark' ? 44 : 22)
  } else {
    stroke(ctx, neck, body, 75)
    if (side === 'back') return
    stroke(ctx, [[396, 97], [396, type === 'button' ? 300 : 239]], '#091326', 12)
    if (type === 'laces') {
      for (let y = 126; y < 228; y += 28) {
        stroke(ctx, [[382, y], [410, y + 23]], '#e2d5b9', 4)
        stroke(ctx, [[410, y], [382, y + 23]], '#e2d5b9', 4)
      }
    } else {
      for (let y = 133; y <= 270; y += 43) {
        ctx.fillStyle = '#787467'
        ctx.beginPath()
        ctx.arc(396, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function pattern(ctx, diseño, side) {
  const { body, accent, pattern, edging, stripe, panel } = diseño
  const y = rowAt(side, kit.band.centre)
  ctx.fillStyle = accent
  if (pattern === 'stripes') {
    const [step, width] = stripe
    for (let x = 8; x < TEMPLATE_W; x += step) ctx.fillRect(x, 0, width, TEMPLATE_H)
    if (panel && side === 'front') {
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.moveTo(190, y - 96)
      ctx.quadraticCurveTo(400, y - 119, 610, y - 96)
      ctx.lineTo(610, y + 94)
      ctx.quadraticCurveTo(400, y + 71, 190, y + 94)
      ctx.closePath()
      ctx.fill()
    }
  } else if (pattern === 'diagonal') {
    ctx.save()
    ctx.translate(400, y)
    ctx.rotate(side === 'front' ? -1.12 : 1.12)
    ctx.fillRect(-431, -53, 862, 106)
    ctx.restore()
  } else if (pattern === 'hoops') {
    for (let row = 143; row < TEMPLATE_H; row += 123) ctx.fillRect(0, row, TEMPLATE_W, 8)
  } else {
    const [offset, half] = diseño.band
    ctx.save()
    ctx.beginPath()
    ctx.rect(side === 'front' ? 200 : 187, 0, 418, TEMPLATE_H)
    ctx.clip()
    if (edging) {
      ctx.fillStyle = edging
      ctx.fillRect(0, y + offset - half - 10, TEMPLATE_W, 2 * half + 20)
    }
    ctx.fillStyle = accent
    ctx.fillRect(0, y + offset - half, TEMPLATE_W, 2 * half)
    ctx.restore()
  }
}

export function paintHistoricShirt(ctx, diseño, stamps, brand) {
  for (const side of ['front', 'back']) {
    ctx.save()
    ctx.translate(side === 'back' ? TEMPLATE_W : 0, 0)
    ctx.beginPath()
    ctx.rect(0, 0, TEMPLATE_W, TEMPLATE_H)
    ctx.clip()
    ctx.fillStyle = diseño.body
    ctx.fillRect(0, 0, TEMPLATE_W, TEMPLATE_H)
    pattern(ctx, diseño, side)

    if (diseño.shoulders) {
      for (const [i, line] of kit.shoulders[side].entries()) {
        const sleeve = diseño.shoulders === 'full'
          ? [...line, [i ? 738 : 68, 272], [i ? 752 : 59, 433]]
          : line.slice(0, 4)
        for (let offset = 0; offset <= 24; offset += 12) {
          stroke(ctx, sleeve.map(([x, y]) => [x, y + offset]), diseño.accent, 7)
        }
      }
    }
    if (diseño.cuff) {
      for (const line of kit.cuffs[side]) stroke(ctx, line, diseño.accent, 24)
    }
    collar(ctx, diseño, side)

    if (side === 'front') {
      for (const { image, target } of stamps) ctx.drawImage(image, ...target)
      if (brand) {
        fit(ctx, brand.adidas, 301, 310, 64)
        fit(ctx, brand.crest, 505, 305, 75)
        fit(ctx, brand.betsson, 400, rowAt('front', kit.band.centre) + 22, 275)
      }
    } else if (brand) {
      ctx.font = 'bold 23px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = diseño.accent
      ctx.fillText('1905', 400, 91)
    }
    ctx.restore()
  }
}
