import React, { useState } from 'react';
import { MonitorDown, X, FolderArchive, FileDown, Laptop } from 'lucide-react';

interface DownloadForPcModalProps {
  isOpen: boolean;
  activeTabTitle: string;
  totalTabsCount: number;
  onClose: () => void;
  onDownloadDesktopLauncher: () => void;
  onDownloadAllAsZipForPc: () => Promise<void>;
  onDownloadCurrentDocxToPc: () => Promise<void>;
}

export const DownloadForPcModal: React.FC<DownloadForPcModalProps> = ({
  isOpen,
  activeTabTitle,
  totalTabsCount,
  onClose,
  onDownloadDesktopLauncher,
  onDownloadAllAsZipForPc,
  onDownloadCurrentDocxToPc,
}) => {
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);

  if (!isOpen) return null;

  const handleZipDownload = async () => {
    setIsPackagingZip(true);
    try {
      await onDownloadAllAsZipForPc();
    } finally {
      setIsPackagingZip(false);
    }
  };

  const handleSingleDownload = async () => {
    setIsDownloadingSingle(true);
    try {
      await onDownloadCurrentDocxToPc();
    } finally {
      setIsDownloadingSingle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <MonitorDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Download for Computer (PC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Save ReportAutomation and your processed Word (.docx) documents directly to your PC.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-6 space-y-3.5">
          {/* Option 1: Desktop App Launcher for PC */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Laptop className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  ReportAutomation Desktop Launcher (Windows / Mac PC)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Downloads a desktop shortcut file to launch ReportAutomation directly from your PC desktop.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadDesktopLauncher}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Download PC App
            </button>
          </div>

          {/* Option 2: Complete PC Archive (.zip) of All Processed Word Documents */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FolderArchive className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  All Processed Word Documents Package (.zip)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exports all {totalTabsCount} documents across Corporation, Cooperative, Sole Proprietorship, and Others into a single PC .zip folder.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isPackagingZip || totalTabsCount === 0}
              onClick={handleZipDownload}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPackagingZip ? 'Packing .zip...' : 'Download All (.zip)'}
            </button>
          </div>

          {/* Option 3: Current Document (.docx) to PC */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileDown className="w-5 h-5 text-slate-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Current Tab Word Document ({activeTabTitle})
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Immediately saves the active processed .docx file to your PC Downloads folder.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isDownloadingSingle || totalTabsCount === 0}
              onClick={handleSingleDownload}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isDownloadingSingle ? 'Saving...' : 'Save .docx to PC'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 bg-slate-50">
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
