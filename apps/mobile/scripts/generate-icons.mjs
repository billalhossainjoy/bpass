import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resDir = path.join(__dirname, "../android/app/src/main/res")
const logoPath = path.join(__dirname, "../../../packages/ui/public/logo.svg")

const logoSvg = await fs.promises.readFile(logoPath, "utf8")

const densities = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
]

for (const [density, launcherSize, foregroundSize] of densities) {
  const mipmapDir = path.join(resDir, `mipmap-${density}`)
  fs.mkdirSync(mipmapDir, { recursive: true })

  await sharp(Buffer.from(logoSvg))
    .resize(launcherSize, launcherSize)
    .png()
    .toFile(path.join(mipmapDir, "ic_launcher.png"))

  await sharp(Buffer.from(logoSvg))
    .resize(launcherSize, launcherSize)
    .png()
    .toFile(path.join(mipmapDir, "ic_launcher_round.png"))

  await sharp(Buffer.from(logoSvg))
    .resize(foregroundSize, foregroundSize)
    .png()
    .toFile(path.join(mipmapDir, "ic_launcher_foreground.png"))
}

console.log("Generated Android launcher icons from packages/ui/public/logo.svg")
