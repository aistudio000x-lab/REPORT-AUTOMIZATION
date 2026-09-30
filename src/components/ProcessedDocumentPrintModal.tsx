import React, { useEffect, useState } from 'react';
import { DocxParagraph, LocalPrinterConfig, TargetWordRule } from '../types/document';
import { applyReplacementsToText } from '../utils/docxProcessor';
import {
  PrintableDocumentPayload,
  saveActivePrintJobToStorage,
} from '../utils/printProcessor';
import {
  X,
  Printer,
  FileDown,
  SlidersHorizontal,
  FileCheck2,
} from 'lucide-react';

interface ProcessedDocumentPrintModalProps {
  isOpen: boolean;
  documents: PrintableDocumentPayload[];
  printerConfig: LocalPrinterConfig;
  onClose: () => void;
  onDownloadProcessedDocx: () => void;
  onOpenPrinterSettings: () => void;
  isStandalonePrintWindow?: boolean;
}

export const ProcessedDocumentSheet: React.FC<{
  doc: PrintableDocumentPayload;
  isLast: boolean;
}> = ({ doc, isLast }) => {
  const renderedBlocks: React.ReactNode[] = [];
  let i = 0;

  const replaceInline = (raw: string, rules: TargetWordRule[]) =>
    applyReplacementsToText(raw, rules);

  while (i < doc.paragraphs.length) {
    const p: DocxParagraph = doc.paragraphs[i];

    if (p.style === 'table-row' && p.cells) {
      const tableRows: DocxParagraph[] = [];
      const startIdx = i;
      while (
        i < doc.paragraphs.length &&
        doc.paragraphs[i].style === 'table-row' &&
        doc.paragraphs[i].cells
      ) {
        tableRows.push(doc.paragraphs[i]);
        i++;
      }

      renderedBlocks.push(
        <div key={`tbl-${startIdx}`} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-700 text-[11pt]">
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={row.id}
                  className={
                    row.bold || rIdx === 0
                      ? 'bg-slate-100 font-bold text-black'
                      : 'bg-white text-black'
                  }
                >
                  {(row.cells || []).map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border border-slate-700 px-3 py-1.5 align-top leading-relaxed"
                    >
                      {replaceInline(cell, doc.rules)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const alignClass =
      p.alignment === 'center'
        ? 'text-center'
        : p.alignment === 'right'
        ? 'text-right'
        : p.alignment === 'justify'
        ? 'text-justify'
        : 'text-left';

    const text = replaceInline(p.text, doc.rules);

    if (p.style === 'title') {
      renderedBlocks.push(
        <h1
          key={p.id}
          className={`font-document text-[16pt] font-bold tracking-wide text-black mb-2 ${alignClass}`}
        >
          {text}
        </h1>
      );
    } else if (p.style === 'subtitle') {
      renderedBlocks.push(
        <h2
          key={p.id}
          className={`font-document text-[13pt] font-bold text-black mb-5 ${alignClass}`}
        >
          {text}
        </h2>
      );
    } else if (p.style === 'heading') {
      renderedBlocks.push(
        <h3
          key={p.id}
          className={`font-document text-[12pt] font-bold text-black mt-5 mb-2 ${alignClass}`}
        >
          {text}
        </h3>
      );
    } else if (p.style === 'signature') {
      renderedBlocks.push(
        <p
          key={p.id}
          className={`font-document text-[12pt] leading-[1.7] text-black mt-8 pt-4 ${
            p.bold ? 'font-bold' : ''
          } ${alignClass}`}
        >
          {text}
        </p>
      );
    } else {
      renderedBlocks.push(
        <p
          key={p.id}
          className={`font-document text-[12pt] leading-[1.75] text-black mb-3.5 ${
            p.bold ? 'font-bold' : ''
          } ${alignClass}`}
        >
          {text}
        </p>
      );
    }

    i++;
  }

  return (
    <section
      className={`print-paper-sheet max-w-[816px] min-h-[1056px] mx-auto mb-8 bg-white border border-slate-300 shadow-md px-10 sm:px-16 py-12 ${
        !isLast ? 'print-page-break' : ''
      }`}
    >
      <div className="no-print mb-6 pb-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{doc.fileName}</span>
        <span>Processed Print Ready</span>
      </div>
      {renderedBlocks}
    </section>
  );
};

export const ProcessedDocumentPrintModal: React.FC<
  ProcessedDocumentPrintModalProps
> = ({
  isOpen,
  documents,
  printerConfig,
  onClose,
  onDownloadProcessedDocx,
  onOpenPrinterSettings,
  isStandalonePrintWindow = false,
}) => {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || documents.length === 0) return;

    saveActivePrintJobToStorage(documents, printerConfig);

    const timer = setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch {
        // Ignored if sandboxed iframe blocks automatic print
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, documents, printerConfig]);

  if (!isOpen || documents.length === 0) return null;

  const headerTitle =
    documents.length === 1
      ? documents[0].fileName
      : `${documents.length} Processed Documents Opened for Printing`;

  const handleDirectPrintNow = () => {
    saveActivePrintJobToStorage(documents, printerConfig);
    try {
      window.focus();
      window.print();
    } catch {
      // Fallback handled by anchor when in iframe
    }
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Top Action Bar (Hidden on physical paper via .no-print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 text-white border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              {headerTitle}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Printer: {printerConfig.printerName} ({printerConfig.paperSize})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isInIframe && !isStandalonePrintWindow ? (
            <a
              href="/?printView=1"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                saveActivePrintJobToStorage(documents, printerConfig)
              }
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleDirectPrintNow}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadProcessedDocx}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Processed .docx</span>
          </button>

          {!isStandalonePrintWindow && (
            <button
              type="button"
              onClick={onOpenPrinterSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Batch / Printer Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Scrollable Processed Document Pages */}
      <div className="print-scroll-viewport flex-1 w-full overflow-y-auto p-4 sm:p-8 bg-slate-200">
        {documents.map((doc, idx) => (
          <ProcessedDocumentSheet
            key={`${doc.fileName}-${idx}`}
            doc={doc}
            isLast={idx === documents.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
