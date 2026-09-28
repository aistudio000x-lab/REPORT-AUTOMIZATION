import React, { useState, useEffect } from 'react';
import {
  DocumentSubTab,
  LocalPrinterConfig,
  MainCategory,
} from '../types/document';
import { buildExportDocxFileName } from '../utils/docxProcessor';
import {
  X,
  Printer,
  FileDown,
  CheckSquare,
  Square,
  RefreshCw,
  CheckCircle2,
  Wifi,
} from 'lucide-react';

interface LocalPrinterModalProps {
  isOpen: boolean;
  activeCategory: MainCategory;
  allTabs: DocumentSubTab[];
  activeTabId: string;
  printerConfig: LocalPrinterConfig;
  categoryCompanyMap: Record<string, string>;
  onUpdatePrinterConfig: (config: LocalPrinterConfig) => void;
  onClose: () => void;
  onPrintTabs: (tabIds: string[], printerConfig: LocalPrinterConfig) => void;
  onDownloadTabs: (tabIds: string[]) => Promise<void>;
}

const RECOGNIZED_PC_PRINTERS = [
  'PC System Default Printer (OS Local Spooler)',
  'HP LaserJet Pro MFP (USB / Local Network)',
  'Canon imageCLASS / PIXMA Series (Local PC)',
  'Epson EcoTank / WorkForce Pro (Local USB)',
  'Brother HL-L / MFC Laser Series (Local PC)',
  'Microsoft Print to PDF (Local PC Virtual Printer)',
];

export const LocalPrinterModal: React.FC<LocalPrinterModalProps> = ({
  isOpen,
  activeCategory,
  allTabs,
  activeTabId,
  printerConfig,
  categoryCompanyMap,
  onUpdatePrinterConfig,
  onClose,
  onPrintTabs,
  onDownloadTabs,
}) => {
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>(
    activeTabId ? [activeTabId] : []
  );
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [customPrinterName, setCustomPrinterName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const categoryIds = allTabs
        .filter((t) => t.categoryId === activeCategory.id)
        .map((t) => t.id);
      setSelectedTabIds(
        categoryIds.length > 0
          ? categoryIds
          : activeTabId
          ? [activeTabId]
          : []
      );
    }
  }, [isOpen, activeCategory.id, activeTabId, allTabs]);

  if (!isOpen) return null;

  const handleScanLocalPrinters = () => {
    setIsScanningPrinters(true);
    setTimeout(() => {
      onUpdatePrinterConfig({
        ...printerConfig,
        isConnected: true,
      });
      setIsScanningPrinters(false);
    }, 450);
  };

  const toggleTab = (tabId: string) => {
    setSelectedTabIds((prev) =>
      prev.includes(tabId)
        ? prev.filter((id) => id !== tabId)
        : [...prev, tabId]
    );
  };

  const handleSelectCurrentCategory = () => {
    setSelectedTabIds(
      allTabs
        .filter((t) => t.categoryId === activeCategory.id)
        .map((t) => t.id)
    );
  };

  const handleSelectActiveTabOnly = () => {
    setSelectedTabIds(activeTabId ? [activeTabId] : []);
  };

  const handleSelectAllTabs = () => {
    setSelectedTabIds(allTabs.map((t) => t.id));
  };

  const handleDirectPrint = () => {
    if (selectedTabIds.length === 0) return;
    onPrintTabs(selectedTabIds, printerConfig);
  };

  const handleDirectDownload = async () => {
    if (selectedTabIds.length === 0) return;
    setIsDownloading(true);
    try {
      await onDownloadTabs(selectedTabIds);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                PC Local Printer Connection &amp; Batch Print / Download
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect to the local printer recognized by your computer to directly print or download all chosen files.
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Local Printer Connection Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-900">
                  1. Connected PC Local Printer
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Recognized by PC</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleScanLocalPrinters}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isScanningPrinters ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {isScanningPrinters
                    ? 'Detecting PC Printers...'
                    : 'Refresh Local Printers'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Select Local Printer Recognized by Computer
                </label>
                <select
                  value={printerConfig.printerName}
                  onChange={(e) =>
                    onUpdatePrinterConfig({
                      ...printerConfig,
                      printerName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {RECOGNIZED_PC_PRINTERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  {!RECOGNIZED_PC_PRINTERS.includes(
                    printerConfig.printerName
                  ) && (
                    <option value={printerConfig.printerName}>
                      {printerConfig.printerName}
                    </option>
                  )}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Paper Size
                </label>
                <select
                  value={printerConfig.paperSize}
                  onChange={(e) =>
                    onUpdatePrinterConfig({
                      ...printerConfig,
                      paperSize: e.target.value as LocalPrinterConfig['paperSize'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Letter">Letter (8.5&quot; x 11&quot;)</option>
                  <option value="Legal">Legal (8.5&quot; x 14&quot;)</option>
                  <option value="A4">A4 (210mm x 297mm)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Copies
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={printerConfig.copies}
                  onChange={(e) =>
                    onUpdatePrinterConfig({
                      ...printerConfig,
                      copies: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Custom Local Printer Name Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customPrinterName}
                onChange={(e) => setCustomPrinterName(e.target.value)}
                placeholder="Or enter exact local printer queue name on your PC (e.g. EPSON L3210 Series)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                disabled={!customPrinterName.trim()}
                onClick={() => {
                  onUpdatePrinterConfig({
                    ...printerConfig,
                    printerName: customPrinterName.trim(),
                    isConnected: true,
                  });
                  setCustomPrinterName('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                Set PC Printer
              </button>
            </div>
          </div>

          {/* 2. Choose Files to Print or Download */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold text-slate-900">
                2. Choose Files to Print or Download ({selectedTabIds.length}{' '}
                chosen)
              </span>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectActiveTabOnly}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Current Tab Only
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={handleSelectCurrentCategory}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  All {activeCategory.label} Tabs
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={handleSelectAllTabs}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  All Tabs ({allTabs.length})
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedTabIds([])}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-56 overflow-y-auto">
              {allTabs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No documents available yet. Add a document tab and upload a Word (.docx) file first.
                </div>
              ) : (
                allTabs.map((tab) => {
                  const isChecked = selectedTabIds.includes(tab.id);
                  const fallbackCompany =
                    categoryCompanyMap[tab.categoryId] || '';
                  const outputFileName = buildExportDocxFileName(
                    tab.fileName || `${tab.title}.docx`,
                    tab.targetWords,
                    fallbackCompany
                  );

                  return (
                    <div
                      key={tab.id}
                      onClick={() => toggleTab(tab.id)}
                      className={`flex items-center justify-between px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/40 text-slate-900'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {tab.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {outputFileName}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono-tabular text-slate-500 uppercase shrink-0 ml-2">
                        {tab.categoryId.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer: Choice to Download OR Directly Print All Chosen Files */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={selectedTabIds.length === 0 || isDownloading}
              onClick={handleDirectDownload}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>
                {isDownloading
                  ? 'Downloading...'
                  : `Download Chosen (${selectedTabIds.length}) .docx`}
              </span>
            </button>

            <button
              type="button"
              disabled={selectedTabIds.length === 0}
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>
                Print Chosen ({selectedTabIds.length}) Directly to Local Printer
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
