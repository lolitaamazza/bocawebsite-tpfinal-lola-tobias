import { kit } from '@/three/kit/kitSpec'
import { TEMPLATE_H, TEMPLATE_W, rowAt } from '@/three/kit/uvMap'

function label(ctx, text, x, y, size, color) {
  ctx.font = `bold ${size}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function shield(ctx, color) {
  ctx.fillStyle = '#142854'
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(476, 165)
  ctx.lineTo(542, 165)
  ctx.lineTo(535, 208)
  ctx.quadraticCurveTo(528, 226, 509, 234)
  ctx.quadraticCurveTo(488, 226, 482, 208)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  label(ctx, 'CABJ', 509, 194, 19, color)
}

export function paintHistoricShirt(ctx, diseño) {
  const { body, accent, pattern, edging, collar, shoulders, stripe, sponsor, crest, longSleeves } = diseño
  for (const side of ['front', 'back']) {
    ctx.save()
    ctx.translate(side === 'back' ? TEMPLATE_W : 0, 0)
    ctx.beginPath()
    ctx.rect(0, 0, TEMPLATE_W, TEMPLATE_H)
    ctx.clip()
    ctx.fillStyle = body
    ctx.fillRect(0, 0, TEMPLATE_W, TEMPLATE_H)

    const y = rowAt(side, kit.band.centre)
    ctx.fillStyle = accent
    if (pattern === 'stripes') {
      const [step, width] = stripe
      for (let x = 8; x < TEMPLATE_W; x += step) ctx.fillRect(x, 0, width, TEMPLATE_H)
    } else if (pattern === 'hoops') {
      for (let row = y - 288; row < TEMPLATE_H; row += 144) ctx.fillRect(0, row, TEMPLATE_W, 9)
    } else if (pattern === 'diagonal') {
      ctx.translate(400, y)
      ctx.rotate(side === 'front' ? -0.95 : 0.95)
      ctx.fillRect(-800, -77, 1600, 154)
      ctx.rotate(side === 'front' ? 0.95 : -0.95)
      ctx.translate(-400, -y)
    } else {
      ctx.save()
      if (longSleeves) {
        ctx.beginPath()
        ctx.rect(201, 0, 401, TEMPLATE_H)
        ctx.clip()
      }
      if (edging) {
        ctx.fillStyle = edging
        ctx.fillRect(0, y - 91, TEMPLATE_W, 182)
      }
      ctx.fillStyle = accent
      ctx.fillRect(0, y - 80, TEMPLATE_W, 160)
      ctx.restore()
    }
    if (shoulders) {
      ctx.strokeStyle = accent
      ctx.lineWidth = 6
      for (const line of kit.shoulders[side]) {
        for (let offset = 0; offset <= 18; offset += 9) {
          ctx.beginPath()
          line.forEach(([x, y], i) => i ? ctx.lineTo(x, y + offset) : ctx.moveTo(x, y + offset))
          ctx.stroke()
        }
      }
    }
    if (side === 'front') {
      if (collar === 'laces') label(ctx, '× ×', 396, 142, 31, '#e9ddc7')
      if (collar === 'button') label(ctx, '•', 396, 143, 31, accent)
      if (crest) {
        shield(ctx, crest === 'anniversary' ? accent : '#eab92b')
      }
      if (sponsor) {
        if (pattern === 'stripes') {
          ctx.fillStyle = body
          ctx.fillRect(243, y - 36, 314, 72)
        }
        if (pattern === 'hoops') {
          ctx.fillStyle = body
          ctx.fillRect(260, y - 39, 280, 78)
        }
        label(ctx, sponsor, 400, y, sponsor.length > 10 ? 39 : 55, pattern === 'hoops' ? accent : '#14244a')
      }
    }
    ctx.restore()
  }
}
