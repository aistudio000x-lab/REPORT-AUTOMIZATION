import React, { useState } from 'react';
import {
  MonitorDown,
  X,
  FolderArchive,
  FileDown,
  Laptop,
  CheckCircle2,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadForPcModalProps {
  isOpen: boolean;
  activeTabTitle: string;
  totalTabsCount: number;
  onClose: () => void;
  onDownloadWindowsInstaller: () => void;
  onDownloadDesktopLauncher: () => void;
  onDownloadAllAsZipForPc: () => Promise<void>;
  onDownloadCurrentDocxToPc: () => Promise<void>;
}

export const DownloadForPcModal: React.FC<DownloadForPcModalProps> = ({
  isOpen,
  activeTabTitle,
  totalTabsCount,
  onClose,
  onDownloadWindowsInstaller,
  onDownloadDesktopLauncher,
  onDownloadAllAsZipForPc,
  onDownloadCurrentDocxToPc,
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } =
    usePWAInstall();
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [installerDownloaded, setInstallerDownloaded] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!isOpen) return null;

  const handleInstallPcAppClick = async () => {
    // 1. If native browser PWA install prompt is available, trigger it immediately
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        return;
      }
    }

    // 2. If iOS Safari, show iOS Add to Home Screen guide
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // 3. Download the Windows PC Desktop App Installer (.bat) that creates Desktop & Start Menu shortcuts and opens in standalone --app mode
    onDownloadWindowsInstaller();
    setInstallerDownloaded(true);
  };

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

  const standaloneAppUrl =
    typeof window !== 'undefined' ? window.location.origin : '/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <MonitorDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Install &amp; Download for Computer (PC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Install ReportAutomation as a standalone PC desktop app or save your processed Word (.docx) documents.
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
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Option 1: Install ReportAutomation PC Desktop App */}
          <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/35 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Laptop className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-900">
                      1. Install ReportAutomation Desktop App (Windows / Mac PC)
                    </p>
                    {isInstalled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isInstallable
                      ? 'Ready to install directly onto your computer Desktop, Start Menu, and Taskbar.'
                      : 'Installs a standalone ReportAutomation desktop app icon on your Windows Desktop & Start Menu that opens in its own native PC window.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallPcAppClick}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                {isInstallable
                  ? 'Install PC App Now'
                  : 'Download & Install PC App'}
              </button>
            </div>

            {/* Direct Browser PWA Install Link + Windows Installer Instructions */}
            <div className="pt-3 border-t border-blue-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={standaloneAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Standalone Window for 1-Click Browser Install</span>
                </a>

                <button
                  type="button"
                  onClick={onDownloadDesktopLauncher}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Universal HTML Shortcut</span>
                </button>
              </div>
            </div>

            {installerDownloaded && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Downloaded &ldquo;Install_ReportAutomation_PC.bat&rdquo; to your PC!
                  </span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-emerald-900 space-y-0.5 pl-0.5">
                  <li>
                    Open your Downloads folder and double-click{' '}
                    <strong className="font-mono-tabular">
                      Install_ReportAutomation_PC.bat
                    </strong>
                    .
                  </li>
                  <li>
                    If Windows SmartScreen asks, click{' '}
                    <strong>More info &rarr; Run anyway</strong>.
                  </li>
                  <li>
                    It automatically creates the{' '}
                    <strong>ReportAutomation</strong> app icon on your{' '}
                    <strong>Windows Desktop &amp; Start Menu</strong> and opens the standalone PC app window.
                  </li>
                </ol>
              </div>
            )}

            {isInIframe && !isInstallable && !installerDownloaded && (
              <p className="text-[11px] text-slate-600">
                <strong>Tip:</strong> Click{' '}
                <strong>Download &amp; Install PC App</strong> above to run the Windows desktop installer, or click{' '}
                <strong>Open Standalone Window</strong> and click the{' '}
                <strong>Install ReportAutomation</strong> icon in the right side of your Chrome/Edge address bar.
              </p>
            )}

            {showIOSGuide && (
              <div className="p-3 rounded-lg bg-slate-900 text-white text-xs space-y-1">
                <p className="font-semibold">Install on iPhone / iPad:</p>
                <p className="text-slate-300">
                  1. Tap the <strong>Share</strong> button in Safari. 2. Tap{' '}
                  <strong>Add to Home Screen</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Option 2: Complete PC Archive (.zip) of All Processed Word Documents */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FolderArchive className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  2. All Processed Word Documents Package (.zip)
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
                  3. Current Tab Word Document ({activeTabTitle})
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
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
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
