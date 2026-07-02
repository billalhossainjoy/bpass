import jsQR from "jsqr"

/** Decode a QR code from an image data URL. Returns the decoded text or null. */
export async function decodeQrFromDataUrl(
  dataUrl: string,
): Promise<string | null> {
  const img = await loadImage(dataUrl)
  return decodeQrFromImage(img)
}

/** Decode a QR code from a File/Blob (e.g. an uploaded screenshot). */
export async function decodeQrFromFile(file: File): Promise<string | null> {
  const dataUrl = await fileToDataUrl(file)
  return decodeQrFromDataUrl(dataUrl)
}

function decodeQrFromImage(img: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  })
  return result?.data ?? null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not load image"))
    img.src = src
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}
