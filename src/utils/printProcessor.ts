import {
  DocxParagraph,
  LocalPrinterConfig,
  TargetWordRule,
} from '../types/document';
import { applyReplacementsToText } from './docxProcessor';

export interface PrintableDocumentPayload {
  tabId?: string;
  title: string;
  fileName: string;
  paragraphs: DocxParagraph[];
  rules: TargetWordRule[];
}

export const ACTIVE_PRINT_JOB_STORAGE_KEY =
  'reportautomation_active_print_job_v1';

export interface StoredPrintJob {
  documents: PrintableDocumentPayload[];
  printerConfig: LocalPrinterConfig;
  createdAt: number;
}

export function saveActivePrintJobToStorage(
  documents: PrintableDocumentPayload[],
  printerConfig: LocalPrinterConfig
): void {
  try {
    const job: StoredPrintJob = {
      documents,
      printerConfig,
      createdAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_PRINT_JOB_STORAGE_KEY, JSON.stringify(job));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActivePrintJobFromStorage(): StoredPrintJob | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PRINT_JOB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPrintJob;
    if (parsed && Array.isArray(parsed.documents)) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
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
            return isHeader ? `<th>${replaced}</th>` : `<td>${replaced}</td>`;
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
      blocks.push(`<h1 style="text-align: ${align};">${replacedText}</h1>`);
    } else if (p.style === 'subtitle') {
      blocks.push(`<h2 style="text-align: ${align};">${replacedText}</h2>`);
    } else if (p.style === 'heading') {
      blocks.push(`<h3 style="text-align: ${align};">${replacedText}</h3>`);
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
 * Generates a complete, standalone printable HTML document with auto-print on load
 */
export function buildPrintableDocumentHtml(
  documents: PrintableDocumentPayload[],
  printerConfig?: LocalPrinterConfig
): string {
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
      }">
        <div class="screen-doc-badge">${escapeHtml(doc.fileName)}</div>
        ${bodyHtml}
      </section>`;
    })
    .join('\n');

  const docTitle =
    documents.length === 1
      ? documents[0].fileName
      : `ReportAutomation_Processed_${documents.length}_Documents`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page {
      size: ${pageSizeCss};
      margin: 0.85in;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.65;
      color: #000000;
      background: #e2e8f0;
      margin: 0;
      padding: 64px 16px 28px 16px;
    }
    .top-print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
    }
    .top-print-bar button {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .top-print-bar button:hover {
      background: #1d4ed8;
    }
    .print-document {
      max-width: 8.5in;
      min-height: 11in;
      margin: 0 auto 28px auto;
      background: #ffffff;
      padding: 1in;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
      border: 1px solid #cbd5e1;
      position: relative;
    }
    .screen-doc-badge {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      margin: -1in -1in 0.65in -1in;
      padding: 8px 16px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .top-print-bar {
        display: none !important;
      }
      .print-document {
        max-width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border: none;
      }
      .screen-doc-badge {
        display: none !important;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
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
  <div class="top-print-bar">
    <span><strong>${escapeHtml(docTitle)}</strong> — Ready to Print</span>
    <button type="button" onclick="window.print()">Print Document Now</button>
  </div>
  ${pagesHtml}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
}
