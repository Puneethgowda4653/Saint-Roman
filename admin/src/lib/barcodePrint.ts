export interface LabelProduct {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    base_price: number
}

// Opens a dedicated print window rather than rendering into the current page — labels need
// their own layout (grid of small tags) that has nothing to do with the admin UI, and a
// separate window means window.print() only prints the labels, not the whole dashboard.
// jsbarcode is loaded from a CDN inside that window's own document instead of reusing the
// app's import, since JsBarcode(el, value) expects the element and library to share a realm.
export function printBarcodeLabels(products: LabelProduct[]) {
    const printable = products.filter((p) => p.barcode)
    if (printable.length === 0) {
        window.alert('None of the selected products have a barcode yet.')
        return
    }

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
        window.alert('Pop-up blocked — allow pop-ups for this site to print labels.')
        return
    }

    const labelsHtml = printable
        .map(
            (p) => `
      <div class="label">
        <div class="label-name">${escapeHtml(p.name)}</div>
        <svg class="barcode" data-code="${escapeHtml(p.barcode!)}"></svg>
        <div class="label-meta">${escapeHtml(p.sku ?? '')}${p.sku ? ' · ' : ''}₹${p.base_price}</div>
      </div>`,
        )
        .join('\n')

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Barcode labels</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"></script>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .label { border: 1px solid #ccc; border-radius: 6px; padding: 10px; text-align: center; page-break-inside: avoid; }
  .label-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label-meta { font-size: 11px; color: #555; margin-top: 2px; }
  .barcode { width: 100%; height: auto; }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print</button>
  <div class="grid">
    ${labelsHtml}
  </div>
  <script>
    window.addEventListener('load', function () {
      document.querySelectorAll('.barcode').forEach(function (el) {
        JsBarcode(el, el.getAttribute('data-code'), {
          format: 'CODE128',
          height: 50,
          width: 2,
          fontSize: 13,
          displayValue: true,
          margin: 6,
        });
      });
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`)
    win.document.close()
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}