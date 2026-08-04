import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Camera, CameraOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { BarcodeSvg } from '@/components/shared/BarcodeSvg'
import { printBarcodeLabels } from '@/lib/barcodePrint'

interface Variant {
    size: string
    color: string
    price: number
    stock_quantity: number
}

interface ScannedProduct {
    id: string
    name: string
    slug: string
    image_url: string | null
    sku: string | null
    barcode: string | null
    brand: string | null
    hsn_code: string | null
    gst_percent: number | null
    cost_price: number | null
    base_price: number
    status: 'draft' | 'active' | 'archived'
    category: { id: string; name: string } | null
    product_variants: Variant[]
}

// Admin-only scan-to-lookup — mirrors what Myntra/Flipkart warehouse staff do with an internal
// SKU barcode: scan it, instantly see the product record. Two input paths feed the same lookup:
//  1. A physical USB/Bluetooth barcode scanner — these act as a keyboard (HID), typing the
//     code followed by Enter into whatever input is focused. The always-focused text input
//     below is all that's needed for that path, no special driver/library required.
//  2. A laptop/phone camera, via the optional "Scan with camera" toggle (html5-qrcode/ZXing).
export function BarcodeScannerPage() {
    const [code, setCode] = useState('')
    const [product, setProduct] = useState<ScannedProduct | null>(null)
    const [notFound, setNotFound] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [cameraOn, setCameraOn] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)

    // Keep the hardware-scanner input focused whenever the camera isn't active, so a physical
    // scanner "just works" without the admin clicking into a field first.
    useEffect(() => {
        if (!cameraOn) inputRef.current?.focus()
    }, [cameraOn, product, notFound])

    async function lookup(rawCode: string) {
        const trimmed = rawCode.trim()
        if (!trimmed) return
        setLoading(true)
        setNotFound(null)
        try {
            const res = await apiFetch(`/products/barcode/${encodeURIComponent(trimmed)}`)
            setProduct(res.product)
        } catch {
            setProduct(null)
            setNotFound(trimmed)
            toast.error('No product matches that barcode')
        } finally {
            setLoading(false)
            setCode('')
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault()
            lookup(code)
        }
    }

    async function toggleCamera() {
        if (cameraOn) {
            await scannerRef.current?.stop().catch(() => { })
            scannerRef.current = null
            setCameraOn(false)
            return
        }

        setCameraOn(true)
        // Loaded lazily — this library isn't needed until someone actually opts into camera
        // scanning, and it pulls in a camera-access permission prompt we shouldn't trigger by default.
        const { Html5Qrcode } = await import('html5-qrcode')
        const instance = new Html5Qrcode('barcode-camera-region')
        scannerRef.current = instance
        try {
            await instance.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 280, height: 120 } },
                (decodedText) => {
                    lookup(decodedText)
                },
                undefined,
            )
        } catch {
            toast.error('Could not access the camera — check browser permissions')
            setCameraOn(false)
            scannerRef.current = null
        }
    }

    useEffect(() => {
        return () => {
            scannerRef.current?.stop().catch(() => { })
        }
    }, [])

    const stock = product ? product.product_variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) : 0

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold">Barcode Scanner</h1>
                <p className="text-sm text-muted-foreground">
                    Scan a product's internal barcode with a USB/Bluetooth scanner, or use your camera. Admin-only — this page and the barcode values it looks up are never exposed on the storefront.
                </p>
            </div>

            <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                autoFocus
                                placeholder="Scan or type a barcode, then press Enter"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" onClick={() => lookup(code)} disabled={loading || !code}>
                            Look up
                        </Button>
                        <Button variant="outline" onClick={toggleCamera}>
                            {cameraOn ? <CameraOff className="mr-1 h-4 w-4" /> : <Camera className="mr-1 h-4 w-4" />}
                            {cameraOn ? 'Stop camera' : 'Scan with camera'}
                        </Button>
                    </div>
                    {cameraOn && <div id="barcode-camera-region" className="mx-auto w-full max-w-sm" />}
                </CardContent>
            </Card>

            {notFound && (
                <p className="text-sm text-destructive">No product found for barcode "{notFound}".</p>
            )}

            {product && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{product.name}</CardTitle>
                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>{product.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                            {product.image_url && (
                                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                            )}
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <div className="text-muted-foreground">SKU</div>
                                <div>{product.sku ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Category</div>
                                <div>{product.category?.name ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Brand</div>
                                <div>{product.brand ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Price</div>
                                <div>₹{product.base_price}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Stock (all variants)</div>
                                <div>{stock}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">HSN / GST</div>
                                <div>{product.hsn_code ?? '—'} {product.gst_percent ? `· ${product.gst_percent}%` : ''}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-muted-foreground mb-1">Barcode</div>
                                <BarcodeSvg value={product.barcode ?? ''} height={40} fontSize={11} />
                            </div>
                        </div>
                    </CardContent>
                    <CardContent className="flex gap-2 pt-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                printBarcodeLabels([
                                    { id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, base_price: product.base_price },
                                ])
                            }
                        >
                            Print label
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/products`, '_self')}>
                            Go to Products
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}