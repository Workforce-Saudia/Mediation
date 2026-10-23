/**
 * Prepare a logo before upload: remove the white background (→ transparent)
 * and crop the empty margins, so the logo fits the header/footer tightly.
 */
export async function trimLogo(file, pad = 6) {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const w = img.naturalWidth
    const h = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, w, h)
    const p = d.data
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const lo = Math.min(p[i], p[i + 1], p[i + 2])
        let a = p[i + 3]
        if (lo >= 248) a = 0
        else if (lo > 208) a = Math.round((a * (248 - lo)) / 40) // soft edges
        p[i + 3] = a
        if (a > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return file
    ctx.putImageData(d, 0, 0)
    const out = document.createElement('canvas')
    out.width = maxX - minX + 1 + pad * 2
    out.height = maxY - minY + 1 + pad * 2
    out.getContext('2d').drawImage(c, pad - minX, pad - minY)
    const blob = await new Promise((r) => out.toBlob(r, 'image/png'))
    return new File([blob], `${file.name.replace(/\.\w+$/, '')}.png`, { type: 'image/png' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
