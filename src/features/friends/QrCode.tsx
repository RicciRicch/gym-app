import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** A QR code as a crisp SVG (dark modules on white, with the quiet zone it needs to scan). */
export function QrCode({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col},${row}h1v1h-1z`
    }
    return { size: n, path: d }
  }, [value])

  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} className={className} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x="-2" y="-2" width={size + 4} height={size + 4} rx="1.5" fill="#fff" />
      <path d={path} fill="#0b0d10" />
    </svg>
  )
}
