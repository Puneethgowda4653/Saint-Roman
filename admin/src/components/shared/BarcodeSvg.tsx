import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeSvgProps {
    value: string
    height?: number
    width?: number
    fontSize?: number
    className?: string
}

// Renders a Code128 barcode inline (product edit page, admin-only). Never rendered on the
// storefront — the raw barcode value itself is already excluded from the public API
// (server/routes/public.js), this component is just the visual on top of that.
export function BarcodeSvg({ value, height = 60, width = 2, fontSize = 14, className }: BarcodeSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useEffect(() => {
        if (!ref.current || !value) return
        try {
            JsBarcode(ref.current, value, {
                format: 'CODE128',
                height,
                width,
                fontSize,
                displayValue: true,
                margin: 8,
            })
        } catch {
            // Malformed/empty value — leave the svg blank rather than crash the page.
        }
    }, [value, height, width, fontSize])

    if (!value) {
        return <p className="text-sm text-muted-foreground">No barcode yet — save the product once to generate one.</p>
    }

    return <svg ref={ref} className={className} />
}