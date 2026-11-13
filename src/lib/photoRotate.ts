// 참고사진 회전 (2026.11.06) — 화면에서는 CSS로 돌려 보여 주고, 저장할 때 이 함수로 실제 이미지를 돌린다.
// 새 사진(File)과 이미 올린 사진(public URL) 모두 받는다. 큰 카메라 사진은 긴 변 2000px로 줄인다.
const MAX_SIDE = 2000

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // 이미 올린 사진(Storage public URL)도 캔버스에 그릴 수 있게
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('사진을 불러오지 못했어요.'))
    img.src = src
  })
}

export async function rotateImage(source: File | string, degrees: number): Promise<Blob> {
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source)
  try {
    const img = await loadImage(objectUrl ?? (source as string))
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const quarter = ((degrees % 360) + 360) % 360
    const swap = quarter === 90 || quarter === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? h : w
    canvas.height = swap ? w : h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('사진을 돌리지 못했어요.')
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((quarter * Math.PI) / 180)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 돌리지 못했어요.'))), 'image/jpeg', 0.9)
    )
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
