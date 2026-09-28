import React, { useState, useEffect, useRef } from 'react';
import { DocumentSubTab, MainCategory } from '../types/document';
import { CATEGORY_DEFAULT_SCAN_WORDS } from '../data/defaultTemplates';
import {
  buildExportDocxFileName,
  countRuleMatches,
} from '../utils/docxProcessor';
import {
  X,
  Building2,
  CheckSquare,
  Square,
  Layers,
  Check,
  FileDown,
  CheckCircle2,
  Printer,
} from 'lucide-react';

export interface CategoryDefaultEntry {
  scanWord: string;
  replaceText: string;
}

interface CategoryDefaultsModalProps {
  isOpen: boolean;
  activeCategory: MainCategory;
  categoryTabs: DocumentSubTab[];
  initialValues: CategoryDefaultEntry[];
  onClose: () => void;
  onApplyDefaults: (
    categoryId: MainCategory['id'],
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => void;
  onExportAppliedTabs: (
    categoryId: MainCategory['id'],
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => Promise<void>;
  onPrintAppliedTabs: (
    categoryId: MainCategory['id'],
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => void;
}

export const CorporationDefaultsModal: React.FC<CategoryDefaultsModalProps> = ({
  isOpen,
  activeCategory,
  categoryTabs,
  initialValues,
  onClose,
  onApplyDefaults,
  onExportAppliedTabs,
  onPrintAppliedTabs,
}) => {
  const defaultWordsForCategory =
    CATEGORY_DEFAULT_SCAN_WORDS[activeCategory.id];

  const [entries, setEntries] = useState<CategoryDefaultEntry[]>(() =>
    defaultWordsForCategory.map((word) => ({
      scanWord: word,
      replaceText: '',
    }))
  );

  const [applyScope, setApplyScope] = useState<'all' | 'selected'>('all');
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
  const [hasApplied, setHasApplied] = useState(false);
  const [appliedTabIds, setAppliedTabIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const wasOpenRef = useRef(false);
  const lastCategoryIdRef = useRef<string>(activeCategory.id);
  const exportBannerRef = useRef<HTMLDivElement | null>(null);

  // Initialize state only when modal opens or switches category
  useEffect(() => {
    const categoryChanged = lastCategoryIdRef.current !== activeCategory.id;
    if ((isOpen && !wasOpenRef.current) || (isOpen && categoryChanged)) {
      if (initialValues && initialValues.length > 0) {
        setEntries(initialValues);
      } else {
        setEntries(
          CATEGORY_DEFAULT_SCAN_WORDS[activeCategory.id].map((word) => ({
            scanWord: word,
            replaceText: '',
          }))
        );
      }
      setSelectedTabIds(categoryTabs.map((t) => t.id));
      setApplyScope('all');
      setHasApplied(false);
      setAppliedTabIds([]);
    }
    wasOpenRef.current = isOpen;
    lastCategoryIdRef.current = activeCategory.id;
  }, [isOpen, activeCategory.id, initialValues, categoryTabs]);

  // Smoothly scroll the confirmation & export panel into view when Apply is clicked
  useEffect(() => {
    if (hasApplied && exportBannerRef.current) {
      exportBannerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [hasApplied]);

  if (!isOpen) return null;

  const handleUpdateEntry = (
    index: number,
    field: 'scanWord' | 'replaceText',
    value: string
  ) => {
    setHasApplied(false);
    setEntries((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const toggleTabSelection = (tabId: string) => {
    setHasApplied(false);
    setSelectedTabIds((prev) =>
      prev.includes(tabId)
        ? prev.filter((id) => id !== tabId)
        : [...prev, tabId]
    );
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetIds =
      applyScope === 'all' ? categoryTabs.map((t) => t.id) : selectedTabIds;

    setAppliedTabIds(targetIds);
    setHasApplied(true);
    onApplyDefaults(activeCategory.id, entries, targetIds);
  };

  const handleExportClick = async (specificTabIds?: string[]) => {
    const idsToExport =
      specificTabIds && specificTabIds.length > 0
        ? specificTabIds
        : appliedTabIds;
    if (idsToExport.length === 0) return;

    setIsExporting(true);
    try {
      await onExportAppliedTabs(activeCategory.id, entries, idsToExport);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintClick = (specificTabIds?: string[]) => {
    const idsToPrint =
      specificTabIds && specificTabIds.length > 0
        ? specificTabIds
        : appliedTabIds;
    if (idsToPrint.length === 0) return;
    onPrintAppliedTabs(activeCategory.id, entries, idsToPrint);
  };

  const encodedCount = entries.filter(
    (e) => e.replaceText.trim().length > 0
  ).length;

  const appliedTabsList = categoryTabs.filter((t) =>
    appliedTabIds.includes(t.id)
  );

  const currentCompanyName = entries[0]?.replaceText?.trim() || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {activeCategory.label} Default Scan Words &amp; Replacements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter replacement values for the default {activeCategory.label}{' '}
                scan words, apply them to your tabs, and export or print.
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

        {/* Form Wrapper */}
        <form
          onSubmit={handleApplySubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Default Scan Words Input Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-900">
                  1. Encode Replace Text for Default {activeCategory.label} Scan Words
                </span>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {encodedCount} of {entries.length} filled
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100/80 text-[11px] font-semibold text-slate-600">
                  <div className="col-span-5">Default Scan Word</div>
                  <div className="col-span-7">Replace Text (User Input)</div>
                </div>

                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-center bg-white"
                  >
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={entry.scanWord}
                        onChange={(e) =>
                          handleUpdateEntry(idx, 'scanWord', e.target.value)
                        }
                        aria-label="Default scan word"
                        className="w-full px-3 py-2 text-xs font-mono-tabular font-medium bg-slate-100 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={entry.replaceText}
                        onChange={(e) =>
                          handleUpdateEntry(idx, 'replaceText', e.target.value)
                        }
                        placeholder="Enter replacement text..."
                        autoFocus={idx === 0}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Choice of Application Scope (All Tabs vs Selected Tabs) */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-900 mb-2.5">
                2. Where would you like to apply these default scan words?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setApplyScope('all');
                    setHasApplied(false);
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    applyScope === 'all'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      applyScope === 'all'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {applyScope === 'all' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Apply in all tabs under {activeCategory.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {categoryTabs.length === 0
                        ? `Saves defaults for all tabs you add under ${activeCategory.label}.`
                        : `Updates all ${categoryTabs.length} ${activeCategory.label} document tabs simultaneously.`}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApplyScope('selected');
                    setHasApplied(false);
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    applyScope === 'selected'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      applyScope === 'selected'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {applyScope === 'selected' && (
                      <Check className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Select specific tabs only
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose only a few tabs under {activeCategory.label} where
                      changes will be applied.
                    </p>
                  </div>
                </button>
              </div>

              {/* Specific Tab Selection Checklist */}
              {applyScope === 'selected' && (
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  {categoryTabs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 text-center">
                      No document tabs added under {activeCategory.label} yet. Add a document tab and upload a Word (.docx) file first.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">
                          Select {activeCategory.label} Tabs (
                          {selectedTabIds.length} of {categoryTabs.length}{' '}
                          selected):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTabIds(categoryTabs.map((t) => t.id));
                              setHasApplied(false);
                            }}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTabIds([]);
                              setHasApplied(false);
                            }}
                            className="text-xs text-slate-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                        {categoryTabs.map((tab) => {
                          const isChecked = selectedTabIds.includes(tab.id);
                          const totalMatchesInTab = entries.reduce(
                            (sum, entry) =>
                              sum +
                              countRuleMatches(
                                tab.paragraphs,
                                entry.scanWord,
                                false,
                                false
                              ),
                            0
                          );

                          return (
                            <div
                              key={tab.id}
                              onClick={() => toggleTabSelection(tab.id)}
                              className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-white border-blue-500 text-slate-900'
                                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="font-medium truncate">
                                  {tab.title}
                                </span>
                                {tab.fileName && (
                                  <span className="text-slate-400 truncate hidden sm:inline">
                                    ({tab.fileName})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0 ml-2">
                                {totalMatchesInTab}{' '}
                                {totalMatchesInTab === 1 ? 'match' : 'matches'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Export & Automatic Download OR Direct Print Section (Appears after clicking Apply) */}
            {hasApplied && (
              <div
                ref={exportBannerRef}
                className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-950">
                        {appliedTabsList.length > 0
                          ? `3. Replacements Applied to ${appliedTabsList.length} ${
                              appliedTabsList.length === 1
                                ? `${activeCategory.label} Tab`
                                : `${activeCategory.label} Tabs`
                            }`
                          : `3. Default Scan Words Saved for ${activeCategory.label}`}
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {appliedTabsList.length > 0
                          ? 'Choose to download the processed Word (.docx) or directly print all chosen files to your local printer.'
                          : `Add a tab and upload a Word (.docx) document under ${activeCategory.label} to export or print.`}
                      </p>
                    </div>
                  </div>

                  {appliedTabsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => handleExportClick()}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>
                          {isExporting
                            ? 'Downloading...'
                            : appliedTabsList.length === 1
                            ? 'Download .docx'
                            : `Download All (${appliedTabsList.length}) .docx`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintClick()}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        <Printer className="w-4 h-4 text-blue-400" />
                        <span>
                          {appliedTabsList.length === 1
                            ? 'Print Directly'
                            : `Print All (${appliedTabsList.length}) Files`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {appliedTabsList.length > 0 && (
                  <div className="pt-2.5 border-t border-emerald-200 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-emerald-900 font-medium">
                      Individual files:
                    </span>
                    {appliedTabsList.map((tab) => {
                      const previewDownloadName = buildExportDocxFileName(
                        tab.fileName || `${tab.title}.docx`,
                        tab.targetWords,
                        currentCompanyName
                      );
                      return (
                        <div
                          key={tab.id}
                          className="inline-flex items-center bg-white border border-emerald-300 rounded-md overflow-hidden"
                        >
                          <button
                            type="button"
                            disabled={isExporting}
                            onClick={() => handleExportClick([tab.id])}
                            title={`Download ${previewDownloadName}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-950 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <FileDown className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {previewDownloadName}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintClick([tab.id])}
                            title={`Print ${tab.title} to Local Printer`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 border-l border-emerald-200 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3 text-blue-600" />
                            <span>Print</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {hasApplied ? 'Done & Close' : 'Close'}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={
                  applyScope === 'selected' &&
                  categoryTabs.length > 0 &&
                  selectedTabIds.length === 0
                }
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors cursor-pointer shadow-xs ${
                  hasApplied
                    ? 'text-slate-800 bg-slate-200 hover:bg-slate-300'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {categoryTabs.length === 0
                    ? `Save Default Scan Words`
                    : applyScope === 'all'
                    ? `Apply to All ${categoryTabs.length} ${activeCategory.label} Tabs`
                    : `Apply to ${selectedTabIds.length} Selected ${
                        selectedTabIds.length === 1 ? 'Tab' : 'Tabs'
                      }`}
                </span>
              </button>

              {hasApplied && appliedTabsList.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleExportClick()}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>
                      {isExporting ? 'Downloading...' : 'Download .docx'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintClick()}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Print Chosen Files</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
