// 바코드 인식(zxing-wasm) 파일을 public/zxing/로 복사 — 외부 CDN 대신 우리 사이트에서 내려준다.
// dev·build 전에 자동 실행(package.json predev/prebuild). 복사본은 git에 넣지 않음(.gitignore).
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const candidates = [
  'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
  'node_modules/barcode-detector/node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
].map((p) => path.join(process.cwd(), p))
const src = candidates.find((p) => existsSync(p))
if (!src) throw new Error('zxing_reader.wasm을 찾지 못했어요 — npm install 확인')
const dest = path.join(process.cwd(), 'public/zxing/zxing_reader.wasm')
mkdirSync(path.dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log('zxing_reader.wasm → public/zxing/')
