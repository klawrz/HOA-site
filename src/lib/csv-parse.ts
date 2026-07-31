// Minimal, dependency-free CSV reader (RFC 4180 quoting) - deliberately not
// a full spreadsheet parser. Supporting .xlsx directly would mean pulling in
// a binary parser (the only maintained option on npm, `xlsx`, carries an
// unpatched high-severity prototype-pollution/ReDoS advisory), and CSV is
// what every spreadsheet tool - Excel, Google Sheets, an accountant's
// software - can export to, so this covers the real need without that risk.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c === "\r") {
      // skip - \r\n line endings are handled by the \n branch
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

export function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate)
    if (idx !== -1) return idx
  }
  return -1
}

export function parseMoney(value: string | undefined): number | null {
  if (!value) return null
  const cleaned = value.replace(/[$,\s]/g, "")
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}
