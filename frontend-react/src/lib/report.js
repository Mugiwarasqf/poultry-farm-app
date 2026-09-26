/**
 * Downloadable reports, built in the browser as a PDF with a real table.
 *
 * These used to be CSV files. A CSV opened on a phone shows as raw
 * comma-separated text, which is unreadable for most farmers; a PDF opens
 * natively on any phone and prints cleanly. There is still no export endpoint
 * on the backend (the S3 reports bucket exists but nothing writes to it).
 *
 * jsPDF is loaded only when a report is actually downloaded, so it stays out
 * of the main bundle. Its built-in fonts have no ₦ glyph, so money columns
 * should say "NGN" in the header rather than putting ₦ in the cells.
 */

const BRAND_GREEN = [13, 92, 58]; // #0D5C3A
const STRIPE = [245, 245, 244]; // stone-100

/**
 * @param {object} report
 * @param {string} report.filename  ends in .pdf
 * @param {string} report.title     e.g. "Feed Report"
 * @param {string} [report.subtitle] e.g. the batch name
 * @param {string[]} report.headers
 * @param {Array<Array<string|number>>} report.rows
 */
export async function downloadTableReport({ filename, title, subtitle, headers, rows }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  // Landscape once a table gets wide, so columns aren't squeezed on A4.
  const doc = new jsPDF({ orientation: headers.length > 4 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const left = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_GREEN);
  doc.text('FarmBook', left, 44);

  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23);
  doc.text(title, left, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  const generated = `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  doc.text(subtitle ? `${subtitle}  ·  ${generated}` : generated, left, 82);

  autoTable(doc, {
    startY: 96,
    head: [headers],
    body: rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))),
    margin: { left, right: left },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [41, 37, 36], lineColor: [231, 229, 228], lineWidth: 0.5 },
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: STRIPE },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      const { height } = doc.internal.pageSize;
      doc.setFontSize(8);
      doc.setTextColor(168, 162, 158);
      doc.text(`Page ${page}`, left, height - 20);
    },
  });

  doc.save(filename);
}
