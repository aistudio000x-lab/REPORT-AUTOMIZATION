import {
  DocxParagraph,
  LocalPrinterConfig,
  TargetWordRule,
} from '../types/document';
import { applyReplacementsToText } from './docxProcessor';

export interface PrintableDocumentPayload {
  title: string;
  fileName: string;
  paragraphs: DocxParagraph[];
  rules: TargetWordRule[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDocumentParagraphsHtml(
  paragraphs: DocxParagraph[],
  rules: TargetWordRule[]
): string {
  const blocks: string[] = [];
  let i = 0;

  while (i < paragraphs.length) {
    const p = paragraphs[i];

    if (p.style === 'table-row' && p.cells) {
      const rowsHtml: string[] = [];
      let rIdx = 0;
      while (
        i < paragraphs.length &&
        paragraphs[i].style === 'table-row' &&
        paragraphs[i].cells
      ) {
        const row = paragraphs[i];
        const isHeader = row.bold || rIdx === 0;
        const cellsHtml = (row.cells || [])
          .map((cell) => {
            const replaced = escapeHtml(applyReplacementsToText(cell, rules));
            return isHeader
              ? `<th>${replaced}</th>`
              : `<td>${replaced}</td>`;
          })
          .join('');
        rowsHtml.push(`<tr>${cellsHtml}</tr>`);
        rIdx++;
        i++;
      }
      blocks.push(`<table><tbody>${rowsHtml.join('')}</tbody></table>`);
      continue;
    }

    const replacedText = escapeHtml(applyReplacementsToText(p.text, rules));
    const align = p.alignment || 'left';
    const boldStyle = p.bold ? 'font-weight: 700;' : '';

    if (p.style === 'title') {
      blocks.push(
        `<h1 style="text-align: ${align};">${replacedText}</h1>`
      );
    } else if (p.style === 'subtitle') {
      blocks.push(
        `<h2 style="text-align: ${align};">${replacedText}</h2>`
      );
    } else if (p.style === 'heading') {
      blocks.push(
        `<h3 style="text-align: ${align};">${replacedText}</h3>`
      );
    } else if (p.style === 'signature') {
      blocks.push(
        `<p class="signature" style="text-align: ${align}; ${boldStyle}">${replacedText}</p>`
      );
    } else {
      blocks.push(
        `<p style="text-align: ${align}; ${boldStyle}">${replacedText}</p>`
      );
    }

    i++;
  }

  return blocks.join('\n');
}

/**
 * Sends one or multiple processed Word documents directly to the PC's Local Printer Spooler
 * using an isolated print iframe.
 */
export function printDocumentsToLocalPrinter(
  documents: PrintableDocumentPayload[],
  printerConfig?: LocalPrinterConfig
): void {
  if (documents.length === 0) return;

  const pageSizeCss =
    printerConfig?.paperSize === 'Legal'
      ? '8.5in 14in'
      : printerConfig?.paperSize === 'A4'
      ? 'A4 portrait'
      : 'letter portrait';

  const pagesHtml = documents
    .map((doc, idx) => {
      const isLast = idx === documents.length - 1;
      const bodyHtml = renderDocumentParagraphsHtml(doc.paragraphs, doc.rules);
      return `<section class="print-document ${
        !isLast ? 'page-break' : ''
      }">${bodyHtml}</section>`;
    })
    .join('\n');

  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(
    documents.length === 1
      ? documents[0].fileName
      : `ReportAutomation_Batch_Print_${documents.length}_Documents`
  )}</title>
  <style>
    @page {
      size: ${pageSizeCss};
      margin: 1in;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.65;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .print-document {
      max-width: 100%;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    h1 {
      font-size: 16pt;
      font-weight: 700;
      margin: 0 0 8pt 0;
      letter-spacing: 0.02em;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      margin: 0 0 18pt 0;
    }
    h3 {
      font-size: 12pt;
      font-weight: 700;
      margin: 16pt 0 8pt 0;
    }
    p {
      margin: 0 0 11pt 0;
    }
    p.signature {
      margin-top: 24pt;
      padding-top: 10pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      font-size: 10.5pt;
    }
    th, td {
      border: 1px solid #334155;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  // Remove any previous print iframe
  const existingIframe = document.getElementById('reportautomation-print-frame');
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'reportautomation-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 250);
}
