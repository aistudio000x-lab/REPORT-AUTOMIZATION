import React from 'react';
import { ExportHistoryItem } from '../types/document';
import {
  X,
  History,
  FileDown,
  Trash2,
  FileCheck2,
  Printer,
} from 'lucide-react';

interface DownloadHistoryModalProps {
  isOpen: boolean;
  history: ExportHistoryItem[];
  onClose: () => void;
  onClearHistory: () => void;
  onRedownloadItem: (item: ExportHistoryItem) => void;
  onReprintItem: (item: ExportHistoryItem) => void;
}

export const DownloadHistoryModal: React.FC<DownloadHistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onClearHistory,
  onRedownloadItem,
  onReprintItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Downloaded &amp; Printed Documents History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete log of all downloaded and locally printed Word (.docx) documents across Corporation, Cooperative, Sole Proprietorship, and Others.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="py-16 text-center">
              <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                No Downloaded or Printed Documents Recorded Yet
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                When you download or print a Word (.docx) document from any category tab or default scan words pop-up, it will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-100/80 text-[11px] font-semibold text-slate-600">
                <div className="col-span-5">Document .docx File Name</div>
                <div className="col-span-3">Category &amp; Tab</div>
                <div className="col-span-4 text-right">Status / Time / Action</div>
              </div>

              {history.map((item) => {
                const isPrinted = item.actionType === 'printed';
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-center bg-white hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="sm:col-span-5 min-w-0">
                      <p
                        className="font-semibold text-slate-900 truncate"
                        title={item.exportedFileName}
                      >
                        {item.exportedFileName}
                      </p>
                      {item.companyName && (
                        <p className="text-[11px] text-blue-600 font-medium truncate mt-0.5">
                          Company: {item.companyName}
                        </p>
                      )}
                      {isPrinted && item.printerName && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Printer: {item.printerName}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-3 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {item.categoryLabel}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.subTabTitle}
                      </p>
                    </div>

                    <div className="sm:col-span-4 flex sm:flex-col items-end justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPrinted
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isPrinted ? (
                            <>
                              <Printer className="w-2.5 h-2.5" />
                              <span>Printed</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="w-2.5 h-2.5" />
                              <span>Downloaded</span>
                            </>
                          )}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-500">
                          {item.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRedownloadItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReprintItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-blue-600" />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 text-xs text-slate-500">
          <span className="font-mono-tabular">
            Total recorded entries: {history.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
