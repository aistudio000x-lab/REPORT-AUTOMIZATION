/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import {
  DocumentSubTab,
  ExportHistoryItem,
  LocalPrinterConfig,
  MainCategoryId,
  TargetWordRule,
} from './types/document';
import {
  MAIN_CATEGORIES,
  INITIAL_SUB_TABS,
  CATEGORY_DEFAULT_SCAN_WORDS,
  INITIAL_CATEGORY_DEFAULT_ENTRIES,
} from './data/defaultTemplates';
import {
  autoScanDocumentWords,
  buildExportDocxFileName,
  countRuleMatches,
  exportModifiedDocx,
  extractCompanyNameFromRules,
  formatTargetWordLabel,
  generateDocxFromParagraphs,
  parseUploadedDocx,
  refreshRuleMatchCounts,
  triggerBlobDownload,
} from './utils/docxProcessor';
import {
  loadActivePrintJobFromStorage,
  PrintableDocumentPayload,
  saveActivePrintJobToStorage,
} from './utils/printProcessor';
import { WordScannerPanel } from './components/WordScannerPanel';
import { DocumentPaperPreview } from './components/DocumentPaperPreview';
import { AddSubTabModal } from './components/AddSubTabModal';
import {
  CorporationDefaultsModal,
  CategoryDefaultEntry,
} from './components/CorporationDefaultsModal';
import { DownloadHistoryModal } from './components/DownloadHistoryModal';
import { DownloadForPcModal } from './components/DownloadForPcModal';
import { LocalPrinterModal } from './components/LocalPrinterModal';
import { ProcessedDocumentPrintModal } from './components/ProcessedDocumentPrintModal';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  Plus,
  Trash2,
  CheckCircle2,
  FolderOpen,
  History,
  Sliders,
  MonitorDown,
  Printer,
  Upload,
} from 'lucide-react';

const STORAGE_KEY = 'reportautomation_clean_subtabs_v1';
const HISTORY_STORAGE_KEY = 'reportautomation_clean_history_v1';
const CATEGORY_DEFAULTS_STORAGE_KEY = 'reportautomation_clean_defaults_v1';
const PRINTER_CONFIG_STORAGE_KEY = 'reportautomation_clean_printer_v1';

const LEGACY_KEYS_TO_CLEAR = [
  'lexisdraft_ribbon_subtabs_v1',
  'lexisdraft_ribbon_subtabs_v2',
  'lexisdraft_ribbon_subtabs_v3',
  'lexisdraft_export_history_v1',
  'lexisdraft_export_history_v2',
  'lexisdraft_export_history_v3',
  'lexisdraft_category_defaults_v1',
];

export default function App() {
  const isOnline = useOnlineStatus();
  const { isInstalled } = usePWAInstall();

  // Purge any legacy pre-seeded localStorage keys on mount
  useEffect(() => {
    try {
      for (const key of LEGACY_KEYS_TO_CLEAR) {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Load sub-tabs from localStorage or initialize with empty clean slate
  const [subTabs, setSubTabs] = useState<DocumentSubTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to clean slate
    }
    return INITIAL_SUB_TABS;
  });

  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  // Saved Default Scan Word entries for all 4 categories: Corporation, Cooperative, Sole Proprietorship, Others
  const [categoryDefaultEntries, setCategoryDefaultEntries] = useState<
    Record<MainCategoryId, CategoryDefaultEntry[]>
  >(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_DEFAULTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.corporation &&
          parsed.cooperative &&
          parsed.sole_proprietorship &&
          parsed.others
        ) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return INITIAL_CATEGORY_DEFAULT_ENTRIES;
  });

  // Connected PC Local Printer configuration
  const [printerConfig, setPrinterConfig] = useState<LocalPrinterConfig>(() => {
    try {
      const saved = localStorage.getItem(PRINTER_CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      printerName: 'PC System Default Printer (OS Local Spooler)',
      connectionType: 'system_spooler',
      paperSize: 'Letter',
      copies: 1,
      isConnected: true,
    };
  });

  // Active Main Ribbon Tab: Corporation | Cooperative | Sole Proprietorship | Others
  const [activeCategoryId, setActiveCategoryId] =
    useState<MainCategoryId>('corporation');

  // Active Sub-Tab ID under the active Main Ribbon Tab
  const [activeSubTabId, setActiveSubTabId] = useState<string>('');

  // Currently focused word rule ID (for syncing left input list and right live document preview)
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  // Modal state for adding a new sub-tab under the current Main Category
  const [isAddSubTabModalOpen, setIsAddSubTabModalOpen] = useState(false);

  // Pop-up state when clicking Corporation, Cooperative, Sole Proprietorship, or Others in the ribbon
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState(false);

  // History modal state (opened from the History button in the top ribbon)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Download for Computer (PC) modal state
  const [isDownloadForPcModalOpen, setIsDownloadForPcModalOpen] =
    useState(false);

  // PC Local Printer modal state
  const [isLocalPrinterModalOpen, setIsLocalPrinterModalOpen] = useState(false);

  // Opened Processed Document Print Viewer state
  const [isStandalonePrintRoute] = useState<boolean>(() => {
    try {
      return window.location.search.includes('printView=1');
    } catch {
      return false;
    }
  });
  const [openedPrintDocuments, setOpenedPrintDocuments] = useState<
    PrintableDocumentPayload[]
  >(() => {
    try {
      if (window.location.search.includes('printView=1')) {
        const stored = loadActivePrintJobFromStorage();
        if (stored && stored.documents.length > 0) {
          return stored.documents;
        }
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [isPrintViewerOpen, setIsPrintViewerOpen] = useState<boolean>(() => {
    try {
      if (window.location.search.includes('printView=1')) {
        const stored = loadActivePrintJobFromStorage();
        return Boolean(stored && stored.documents.length > 0);
      }
    } catch {
      // Ignore
    }
    return false;
  });

  // Recent export/print toast banner
  const [recentExportBanner, setRecentExportBanner] = useState<string | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);

  // Persist sub-tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subTabs));
    } catch {
      // If quota exceeded due to large base64 docx, ignore
    }
  }, [subTabs]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(exportHistory));
    } catch {
      // Ignore
    }
  }, [exportHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CATEGORY_DEFAULTS_STORAGE_KEY,
        JSON.stringify(categoryDefaultEntries)
      );
    } catch {
      // Ignore
    }
  }, [categoryDefaultEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PRINTER_CONFIG_STORAGE_KEY,
        JSON.stringify(printerConfig)
      );
    } catch {
      // Ignore
    }
  }, [printerConfig]);

  const activeCategory = useMemo(
    () =>
      MAIN_CATEGORIES.find((c) => c.id === activeCategoryId) ||
      MAIN_CATEGORIES[0],
    [activeCategoryId]
  );

  const categorySubTabs = useMemo(
    () => subTabs.filter((tab) => tab.categoryId === activeCategoryId),
    [subTabs, activeCategoryId]
  );

  const categoryCompanyMap = useMemo(() => {
    return {
      corporation: categoryDefaultEntries.corporation?.[0]?.replaceText || '',
      cooperative: categoryDefaultEntries.cooperative?.[0]?.replaceText || '',
      sole_proprietorship:
        categoryDefaultEntries.sole_proprietorship?.[0]?.replaceText || '',
      others: categoryDefaultEntries.others?.[0]?.replaceText || '',
    };
  }, [categoryDefaultEntries]);

  // Ensure activeSubTabId always points to a valid tab within activeCategoryId
  useEffect(() => {
    if (
      categorySubTabs.length > 0 &&
      !categorySubTabs.some((t) => t.id === activeSubTabId)
    ) {
      setActiveSubTabId(categorySubTabs[0].id);
      setActiveRuleId(null);
    }
  }, [activeCategoryId, categorySubTabs, activeSubTabId]);

  const activeSubTab = useMemo(
    () =>
      categorySubTabs.find((t) => t.id === activeSubTabId) ||
      categorySubTabs[0] ||
      null,
    [categorySubTabs, activeSubTabId]
  );

  // Helper to update the currently active sub-tab
  const updateActiveSubTab = (
    updater: (tab: DocumentSubTab) => DocumentSubTab
  ) => {
    if (!activeSubTab) return;
    setSubTabs((prev) =>
      prev.map((tab) => (tab.id === activeSubTab.id ? updater(tab) : tab))
    );
  };

  // Apply Category Default Scan Words to all or selected tabs under that category
  const handleApplyCategoryDefaults = (
    categoryId: MainCategoryId,
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => {
    setCategoryDefaultEntries((prev) => ({
      ...prev,
      [categoryId]: entries,
    }));

    setSubTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (
          tab.categoryId !== categoryId ||
          !targetTabIds.includes(tab.id)
        ) {
          return tab;
        }

        const updatedRules = [...tab.targetWords];

        // Process in reverse so newly inserted default rules stay in order at the top
        for (let i = entries.length - 1; i >= 0; i--) {
          const entry = entries[i];
          const trimmedScan = entry.scanWord.trim();
          if (!trimmedScan) continue;

          const existingIdx = updatedRules.findIndex(
            (r) => r.targetWord.toLowerCase() === trimmedScan.toLowerCase()
          );

          const matchCount = countRuleMatches(
            tab.paragraphs,
            trimmedScan,
            false,
            false
          );

          if (existingIdx !== -1) {
            updatedRules[existingIdx] = {
              ...updatedRules[existingIdx],
              targetWord: trimmedScan,
              replacementValue: entry.replaceText,
              label: formatTargetWordLabel(trimmedScan),
              matchCount,
            };
          } else {
            updatedRules.unshift({
              id: `${categoryId}-default-${tab.id}-${i}-${Date.now()}`,
              targetWord: trimmedScan,
              replacementValue: entry.replaceText,
              label: formatTargetWordLabel(trimmedScan),
              matchCount,
              caseSensitive: false,
              wholeWord: false,
              isAutoDetected: true,
            });
          }
        }

        return {
          ...tab,
          targetWords: updatedRules,
        };
      })
    );

    const categoryObj = MAIN_CATEGORIES.find((c) => c.id === categoryId);
    setRecentExportBanner(
      `Applied ${categoryObj?.label || 'Category'} default scan words to ${
        targetTabIds.length
      } ${targetTabIds.length === 1 ? 'tab' : 'tabs'}.`
    );
    setTimeout(() => setRecentExportBanner(null), 4500);
  };

  // Helper to merge category default entries into a tab's rules
  const mergeEntriesWithTabRules = (
    tab: DocumentSubTab,
    entries: CategoryDefaultEntry[]
  ): TargetWordRule[] => {
    const mergedRules = [...tab.targetWords];
    for (const entry of entries) {
      const trimmedScan = entry.scanWord.trim();
      if (!trimmedScan) continue;
      const idx = mergedRules.findIndex(
        (r) => r.targetWord.toLowerCase() === trimmedScan.toLowerCase()
      );
      if (idx !== -1) {
        mergedRules[idx] = {
          ...mergedRules[idx],
          targetWord: trimmedScan,
          replacementValue: entry.replaceText,
        };
      } else {
        mergedRules.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          targetWord: trimmedScan,
          replacementValue: entry.replaceText,
          label: formatTargetWordLabel(trimmedScan),
          matchCount: 0,
          caseSensitive: false,
          wholeWord: false,
          isAutoDetected: true,
        });
      }
    }
    return refreshRuleMatchCounts(tab.paragraphs, mergedRules);
  };

  // Export and automatically download the processed Word (.docx) document(s) for the applied tabs
  const handleExportAppliedCategoryTabs = async (
    categoryId: MainCategoryId,
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => {
    const tabsToExport = subTabs.filter(
      (t) => t.categoryId === categoryId && targetTabIds.includes(t.id)
    );
    if (tabsToExport.length === 0) return;

    const categoryObj =
      MAIN_CATEGORIES.find((c) => c.id === categoryId) || activeCategory;
    const fallbackCompanyName = entries[0]?.replaceText?.trim() || '';
    const newHistoryItems: ExportHistoryItem[] = [];

    for (const tab of tabsToExport) {
      const refreshedRules = mergeEntriesWithTabRules(tab, entries);
      const blob = await exportModifiedDocx(
        tab.paragraphs,
        refreshedRules,
        tab.docxBase64
      );

      // Build .docx file name containing the Company Name at the end
      const exportedFileName = buildExportDocxFileName(
        tab.fileName,
        refreshedRules,
        fallbackCompanyName
      );
      triggerBlobDownload(blob, exportedFileName);

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompanyName
      );

      newHistoryItems.push({
        id: `exp-${Date.now()}-${tab.id}`,
        subTabId: tab.id,
        subTabTitle: tab.title,
        categoryLabel: categoryObj.label,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'downloaded',
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    setExportHistory((prev) => [...newHistoryItems, ...prev].slice(0, 50));
    setRecentExportBanner(
      `Downloaded ${
        newHistoryItems.length === 1
          ? `"${newHistoryItems[0].exportedFileName}"`
          : `${newHistoryItems.length} processed ${categoryObj.label} Word (.docx) documents`
      } and recorded in History.`
    );
    setTimeout(() => setRecentExportBanner(null), 5000);
  };

  // Directly print all chosen applied tabs from the Category Default Scan Words pop-up and record in History
  const handlePrintAppliedCategoryTabs = (
    categoryId: MainCategoryId,
    entries: CategoryDefaultEntry[],
    targetTabIds: string[]
  ) => {
    const tabsToPrint = subTabs.filter(
      (t) => t.categoryId === categoryId && targetTabIds.includes(t.id)
    );
    if (tabsToPrint.length === 0) return;

    const categoryObj =
      MAIN_CATEGORIES.find((c) => c.id === categoryId) || activeCategory;
    const fallbackCompanyName = entries[0]?.replaceText?.trim() || '';
    const newHistoryItems: ExportHistoryItem[] = [];
    const printablePayloads: PrintableDocumentPayload[] = [];

    for (const tab of tabsToPrint) {
      const refreshedRules = mergeEntriesWithTabRules(tab, entries);
      const exportedFileName = buildExportDocxFileName(
        tab.fileName,
        refreshedRules,
        fallbackCompanyName
      );

      printablePayloads.push({
        tabId: tab.id,
        title: tab.title,
        fileName: exportedFileName,
        paragraphs: tab.paragraphs,
        rules: refreshedRules,
      });

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompanyName
      );

      newHistoryItems.push({
        id: `prt-${Date.now()}-${tab.id}`,
        subTabId: tab.id,
        subTabTitle: tab.title,
        categoryLabel: categoryObj.label,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'printed',
        printerName: printerConfig.printerName,
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    saveActivePrintJobToStorage(printablePayloads, printerConfig);
    setIsDefaultsModalOpen(false);
    setOpenedPrintDocuments(printablePayloads);
    setIsPrintViewerOpen(true);
    setExportHistory((prev) => [...newHistoryItems, ...prev].slice(0, 50));
    setRecentExportBanner(
      `Opened ${
        newHistoryItems.length === 1
          ? `"${newHistoryItems[0].exportedFileName}"`
          : `${newHistoryItems.length} ${categoryObj.label} processed documents`
      } for printing and recorded in History.`
    );
    setTimeout(() => setRecentExportBanner(null), 5000);
  };

  // Print any chosen tab IDs from the Local Printer modal or active tab
  const handlePrintTabsByIds = (
    tabIds: string[],
    customConfig?: LocalPrinterConfig
  ) => {
    const activePrinter = customConfig || printerConfig;
    const tabsToPrint = subTabs.filter((t) => tabIds.includes(t.id));
    if (tabsToPrint.length === 0) return;

    const newHistoryItems: ExportHistoryItem[] = [];
    const printablePayloads: PrintableDocumentPayload[] = [];

    for (const tab of tabsToPrint) {
      const catObj =
        MAIN_CATEGORIES.find((c) => c.id === tab.categoryId) || activeCategory;
      const fallbackCompany =
        categoryDefaultEntries[tab.categoryId]?.[0]?.replaceText || '';
      const refreshedRules = refreshRuleMatchCounts(
        tab.paragraphs,
        tab.targetWords
      );
      const exportedFileName = buildExportDocxFileName(
        tab.fileName || `${tab.title}.docx`,
        refreshedRules,
        fallbackCompany
      );

      printablePayloads.push({
        tabId: tab.id,
        title: tab.title,
        fileName: exportedFileName,
        paragraphs: tab.paragraphs,
        rules: refreshedRules,
      });

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompany
      );

      newHistoryItems.push({
        id: `prt-${Date.now()}-${tab.id}`,
        subTabId: tab.id,
        subTabTitle: tab.title,
        categoryLabel: catObj.label,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'printed',
        printerName: activePrinter.printerName,
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    saveActivePrintJobToStorage(printablePayloads, activePrinter);
    setIsLocalPrinterModalOpen(false);
    setOpenedPrintDocuments(printablePayloads);
    setIsPrintViewerOpen(true);
    setExportHistory((prev) => [...newHistoryItems, ...prev].slice(0, 50));
    setRecentExportBanner(
      `Opened ${
        newHistoryItems.length === 1
          ? `"${newHistoryItems[0].exportedFileName}"`
          : `${newHistoryItems.length} processed documents`
      } for printing and recorded in History.`
    );
    setTimeout(() => setRecentExportBanner(null), 5000);
  };

  // Top Ribbon Print button: immediately opens the processed document and prints it
  const handleRibbonPrintClick = () => {
    if (activeSubTab && activeSubTab.paragraphs.length > 0) {
      handlePrintTabsByIds([activeSubTab.id]);
      return;
    }
    const categoryReadyTabs = categorySubTabs.filter(
      (t) => t.paragraphs.length > 0
    );
    if (categoryReadyTabs.length > 0) {
      handlePrintTabsByIds(categoryReadyTabs.map((t) => t.id));
      return;
    }
    const allReadyTabs = subTabs.filter((t) => t.paragraphs.length > 0);
    if (allReadyTabs.length > 0) {
      handlePrintTabsByIds(allReadyTabs.map((t) => t.id));
      return;
    }
    setIsLocalPrinterModalOpen(true);
  };

  // Download multiple chosen tab IDs from the Local Printer modal
  const handleDownloadTabsByIds = async (tabIds: string[]) => {
    const tabsToDownload = subTabs.filter((t) => tabIds.includes(t.id));
    if (tabsToDownload.length === 0) return;

    const newHistoryItems: ExportHistoryItem[] = [];
    for (const tab of tabsToDownload) {
      const catObj =
        MAIN_CATEGORIES.find((c) => c.id === tab.categoryId) || activeCategory;
      const fallbackCompany =
        categoryDefaultEntries[tab.categoryId]?.[0]?.replaceText || '';
      const refreshedRules = refreshRuleMatchCounts(
        tab.paragraphs,
        tab.targetWords
      );
      const blob = await exportModifiedDocx(
        tab.paragraphs,
        refreshedRules,
        tab.docxBase64
      );
      const exportedFileName = buildExportDocxFileName(
        tab.fileName,
        refreshedRules,
        fallbackCompany
      );
      triggerBlobDownload(blob, exportedFileName);

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompany
      );

      newHistoryItems.push({
        id: `exp-${Date.now()}-${tab.id}`,
        subTabId: tab.id,
        subTabTitle: tab.title,
        categoryLabel: catObj.label,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'downloaded',
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    setExportHistory((prev) => [...newHistoryItems, ...prev].slice(0, 50));
    setRecentExportBanner(
      `Downloaded ${newHistoryItems.length} chosen Word (.docx) ${
        newHistoryItems.length === 1 ? 'document' : 'documents'
      } and recorded in History.`
    );
    setTimeout(() => setRecentExportBanner(null), 5000);
  };

  // Handlers for Word Scanner & Replacement Rules
  const handleUpdateRuleValue = (ruleId: string, newValue: string) => {
    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: tab.targetWords.map((r) =>
        r.id === ruleId ? { ...r, replacementValue: newValue } : r
      ),
    }));
  };

  const handleUpdateRuleTarget = (ruleId: string, newTargetWord: string) => {
    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: tab.targetWords.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              targetWord: newTargetWord,
              label: formatTargetWordLabel(newTargetWord),
              matchCount: countRuleMatches(
                tab.paragraphs,
                newTargetWord,
                r.caseSensitive,
                r.wholeWord
              ),
            }
          : r
      ),
    }));
  };

  const handleToggleRuleOption = (
    ruleId: string,
    field: 'caseSensitive' | 'wholeWord'
  ) => {
    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: tab.targetWords.map((r) => {
        if (r.id !== ruleId) return r;
        const updated = { ...r, [field]: !r[field] };
        return {
          ...updated,
          matchCount: countRuleMatches(
            tab.paragraphs,
            updated.targetWord,
            updated.caseSensitive,
            updated.wholeWord
          ),
        };
      }),
    }));
  };

  const handleAddRule = (
    targetWord: string,
    replacementValue: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ) => {
    if (!activeSubTab) return;
    const existing = activeSubTab.targetWords.find(
      (r) => r.targetWord.toLowerCase() === targetWord.trim().toLowerCase()
    );
    if (existing) {
      setActiveRuleId(existing.id);
      if (replacementValue.trim()) {
        handleUpdateRuleValue(existing.id, replacementValue);
      }
      return;
    }

    const matchCount = countRuleMatches(
      activeSubTab.paragraphs,
      targetWord,
      caseSensitive,
      wholeWord
    );

    const newRule: TargetWordRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetWord: targetWord.trim(),
      replacementValue,
      label: formatTargetWordLabel(targetWord),
      matchCount,
      caseSensitive,
      wholeWord,
      isAutoDetected: false,
    };

    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: [newRule, ...tab.targetWords],
    }));
    setActiveRuleId(newRule.id);
  };

  const handleRemoveRule = (ruleId: string) => {
    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: tab.targetWords.filter((r) => r.id !== ruleId),
    }));
    if (activeRuleId === ruleId) {
      setActiveRuleId(null);
    }
  };

  const handleClearAllValues = () => {
    updateActiveSubTab((tab) => ({
      ...tab,
      targetWords: tab.targetWords.map((r) => ({ ...r, replacementValue: '' })),
    }));
  };

  // Seed default rules for any category when uploading or creating a tab
  const buildSeedRulesForCategory = (
    categoryId: MainCategoryId
  ): TargetWordRule[] => {
    const entries = categoryDefaultEntries[categoryId] || [];
    return entries.map((entry, idx) => ({
      id: `${categoryId}-seed-${Date.now()}-${idx}`,
      targetWord: entry.scanWord,
      replacementValue: entry.replaceText,
      label: formatTargetWordLabel(entry.scanWord),
      matchCount: 0,
      caseSensitive: false,
      wholeWord: false,
      isAutoDetected: true,
    }));
  };

  // Upload a .docx file into the current sub-tab
  const handleUploadDocxIntoCurrentTab = async (file: File) => {
    const { paragraphs, docxBase64 } = await parseUploadedDocx(file);
    const seedRules = buildSeedRulesForCategory(activeCategoryId);
    const scannedRules = autoScanDocumentWords(paragraphs, seedRules);
    const today = new Date().toISOString().slice(0, 10);

    updateActiveSubTab((tab) => ({
      ...tab,
      fileName: file.name,
      fileSize: file.size,
      lastModified: today,
      paragraphs,
      targetWords: scannedRules,
      docxBase64,
      isCustomUploaded: true,
    }));

    setRecentExportBanner(
      `Opened "${file.name}" and scanned ${scannedRules.length} replaceable target words.`
    );
    setTimeout(() => setRecentExportBanner(null), 4500);
  };

  // Create a brand new Sub-Tab under the active Main Category
  const handleCreateSubTab = async ({
    title,
    description,
    uploadedFile,
  }: {
    title: string;
    description: string;
    uploadedFile?: File;
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const newId = `${activeCategoryId}-tab-${Date.now()}`;
    const seedRules = buildSeedRulesForCategory(activeCategoryId);

    if (uploadedFile) {
      const { paragraphs, docxBase64 } = await parseUploadedDocx(uploadedFile);
      const scannedRules = autoScanDocumentWords(paragraphs, seedRules);
      const newTab: DocumentSubTab = {
        id: newId,
        categoryId: activeCategoryId,
        title,
        description,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        lastModified: today,
        paragraphs,
        targetWords: scannedRules,
        docxBase64,
        isCustomUploaded: true,
      };
      setSubTabs((prev) => [...prev, newTab]);
      setActiveSubTabId(newId);
      setRecentExportBanner(
        `Added tab "${title}" under ${activeCategory.label} and scanned ${scannedRules.length} words.`
      );
      setTimeout(() => setRecentExportBanner(null), 4500);
      return;
    }

    // Initialize a clean-slate empty tab ready for Word (.docx) document upload
    const newTab: DocumentSubTab = {
      id: newId,
      categoryId: activeCategoryId,
      title,
      description,
      fileName: '',
      fileSize: 0,
      lastModified: today,
      paragraphs: [],
      targetWords: seedRules,
      isCustomUploaded: false,
    };

    setSubTabs((prev) => [...prev, newTab]);
    setActiveSubTabId(newId);
  };

  // Delete a sub-tab
  const handleDeleteSubTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubTabs((prev) => prev.filter((t) => t.id !== tabId));
  };

  // Download the unmodified source .docx file (with Company Name at the end if available)
  const handleDownloadSourceTemplate = async () => {
    if (!activeSubTab) return;
    const blob = await generateDocxFromParagraphs(activeSubTab.paragraphs, []);
    const fallbackCompany =
      categoryDefaultEntries[activeCategoryId]?.[0]?.replaceText || '';
    const fileNameWithCompany = buildExportDocxFileName(
      activeSubTab.fileName,
      activeSubTab.targetWords,
      fallbackCompany
    );
    triggerBlobDownload(blob, fileNameWithCompany);
  };

  // Export and immediately download the modified Word (.docx) file from the active tab
  const handleExportProcessedDocx = async () => {
    if (!activeSubTab) return;
    setIsExporting(true);
    try {
      const refreshedRules = refreshRuleMatchCounts(
        activeSubTab.paragraphs,
        activeSubTab.targetWords
      );
      const blob = await exportModifiedDocx(
        activeSubTab.paragraphs,
        refreshedRules,
        activeSubTab.docxBase64
      );

      const fallbackCompany =
        categoryDefaultEntries[activeCategoryId]?.[0]?.replaceText || '';
      const exportedFileName = buildExportDocxFileName(
        activeSubTab.fileName,
        refreshedRules,
        fallbackCompany
      );
      triggerBlobDownload(blob, exportedFileName);

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompany
      );

      const historyEntry: ExportHistoryItem = {
        id: `exp-${Date.now()}`,
        subTabId: activeSubTab.id,
        subTabTitle: activeSubTab.title,
        categoryLabel: activeCategory.label,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'downloaded',
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setExportHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
      setRecentExportBanner(
        `Downloaded "${exportedFileName}" and recorded in History.`
      );
      setTimeout(() => setRecentExportBanner(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Re-download an item from the History modal
  const handleRedownloadFromHistory = async (item: ExportHistoryItem) => {
    const targetTab =
      subTabs.find((t) => t.id === item.subTabId) || activeSubTab;
    if (!targetTab) return;

    const refreshedRules = refreshRuleMatchCounts(
      targetTab.paragraphs,
      targetTab.targetWords
    );
    const blob = await exportModifiedDocx(
      targetTab.paragraphs,
      refreshedRules,
      targetTab.docxBase64
    );
    triggerBlobDownload(blob, item.exportedFileName);
  };

  // Re-print an item from the History modal
  const handleReprintFromHistory = (item: ExportHistoryItem) => {
    const targetTab =
      subTabs.find((t) => t.id === item.subTabId) || activeSubTab;
    if (!targetTab) return;
    handlePrintTabsByIds([targetTab.id]);
  };

  // Download Windows PC Installer (.bat) that installs Desktop & Start Menu shortcuts and launches standalone PC app window
  const handleDownloadWindowsInstaller = () => {
    const appUrl = window.location.origin;
    const batLines = [
      '@echo off',
      'title ReportAutomation PC Desktop App Installer',
      'echo ========================================================',
      'echo   Installing ReportAutomation Desktop App on your PC...',
      'echo ========================================================',
      'echo.',
      `set "APP_URL=${appUrl}"`,
      'set "BROWSER_EXE="',
      'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
      'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
      'if "%BROWSER_EXE%"=="" if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
      'if "%BROWSER_EXE%"=="" if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
      'if "%BROWSER_EXE%"=="" if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"',
      '',
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath(\'Desktop\'); $startMenu = [Environment]::GetFolderPath(\'Programs\'); foreach ($dir in @($desktop, $startMenu)) { $s = $ws.CreateShortcut((Join-Path $dir \'ReportAutomation.lnk\')); if (\'%BROWSER_EXE%\' -ne \'\') { $s.TargetPath = \'%BROWSER_EXE%\'; $s.Arguments = \'--app=%APP_URL%\'; $s.IconLocation = \'%BROWSER_EXE%,0\'; } else { $s.TargetPath = \'%APP_URL%\'; } $s.Description = \'ReportAutomation Desktop Application\'; $s.Save(); }"',
      '',
      'echo.',
      'echo [OK] Installed ReportAutomation icon on your Windows Desktop and Start Menu!',
      'echo [OK] Launching ReportAutomation standalone PC window...',
      'if not "%BROWSER_EXE%"=="" (',
      '  start "" "%BROWSER_EXE%" --app="%APP_URL%"',
      ') else (',
      '  start "" "%APP_URL%"',
      ')',
      'timeout /t 3 >nul',
      'exit',
    ];

    const batContent = batLines.join('\r\n');
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Install_ReportAutomation_PC.bat';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setRecentExportBanner(
      'Downloaded "Install_ReportAutomation_PC.bat" — Open it to install ReportAutomation on your Windows Desktop & Start Menu.'
    );
    setTimeout(() => setRecentExportBanner(null), 6000);
  };

  // Download Desktop App Launcher for Computer (PC)
  const handleDownloadDesktopLauncher = () => {
    const appUrl = window.location.href;
    const launcherHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ReportAutomation — Desktop PC Launcher</title>
  <meta http-equiv="refresh" content="0; url=${appUrl}" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 12px; text-align: center; max-width: 420px; }
    a { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Launching ReportAutomation...</h2>
    <p>Opening your ReportAutomation workspace and local PC printer bridge.</p>
    <a href="${appUrl}">Open ReportAutomation</a>
  </div>
</body>
</html>`;
    const blob = new Blob([launcherHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ReportAutomation_PC_Desktop.html';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setRecentExportBanner(
      'Downloaded "ReportAutomation_PC_Desktop.html" launcher to your PC.'
    );
    setTimeout(() => setRecentExportBanner(null), 4500);
  };

  // Download All Processed Documents (.zip) for Computer PC
  const handleDownloadAllAsZipForPc = async () => {
    const zip = new JSZip();
    const newHistoryItems: ExportHistoryItem[] = [];

    for (const tab of subTabs) {
      const catObj = MAIN_CATEGORIES.find((c) => c.id === tab.categoryId);
      const folderName = catObj ? catObj.label : 'Documents';
      const fallbackCompany =
        categoryDefaultEntries[tab.categoryId]?.[0]?.replaceText || '';

      const refreshedRules = refreshRuleMatchCounts(
        tab.paragraphs,
        tab.targetWords
      );
      const docxBlob = await exportModifiedDocx(
        tab.paragraphs,
        refreshedRules,
        tab.docxBase64
      );
      const exportedFileName = buildExportDocxFileName(
        tab.fileName,
        refreshedRules,
        fallbackCompany
      );

      zip.folder(folderName)?.file(exportedFileName, docxBlob);

      const filledRules = refreshedRules.filter(
        (r) => r.replacementValue.trim().length > 0
      );
      const totalChanged = filledRules.reduce(
        (sum, r) => sum + r.matchCount,
        0
      );
      const resolvedCompany = extractCompanyNameFromRules(
        refreshedRules,
        fallbackCompany
      );

      newHistoryItems.push({
        id: `exp-zip-${Date.now()}-${tab.id}`,
        subTabId: tab.id,
        subTabTitle: tab.title,
        categoryLabel: folderName,
        companyName: resolvedCompany || undefined,
        exportedFileName,
        actionType: 'downloaded',
        replacementsApplied: filledRules.length,
        totalInstancesChanged: totalChanged,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ReportAutomation_PC_Documents.zip';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 3000);

    setExportHistory((prev) => [...newHistoryItems, ...prev].slice(0, 50));
    setRecentExportBanner(
      `Downloaded "ReportAutomation_PC_Documents.zip" (${subTabs.length} processed .docx files) to your PC.`
    );
    setTimeout(() => setRecentExportBanner(null), 5000);
  };

  // Handle clicking any Main Category tab in the Ribbon (Corporation, Cooperative, Sole Proprietorship, Others)
  const handleSelectMainCategory = (categoryId: MainCategoryId) => {
    setActiveCategoryId(categoryId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <div
        className={`flex-1 flex flex-col ${
          isPrintViewerOpen ? 'no-print' : ''
        }`}
      >
        {/* ================= TOP BAR CONTRACT (3 ZONES) ================= */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          ReportAutomation
        </a>

        {/* Zone 2: Main Ribbon Category Tabs (Corporation, Cooperative, Sole Proprietorship, Others) */}
        <nav
          aria-label="Entity Category Ribbon"
          className="flex items-center gap-6 overflow-x-auto py-0.5"
        >
          {MAIN_CATEGORIES.map((category) => {
            const isActive = category.id === activeCategoryId;
            const tabCount = subTabs.filter(
              (t) => t.categoryId === category.id
            ).length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelectMainCategory(category.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-blue-600 font-semibold after:absolute after:bottom-[-14px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-600'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <span>{category.label}</span>
                <span className="ml-1.5 text-xs font-mono-tabular text-slate-400">
                  ({tabCount})
                </span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Add Tab + Print + Download for PC + History) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddSubTabModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Document Tab</span>
          </button>

          <button
            type="button"
            onClick={handleRibbonPrintClick}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDownloadForPcModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <MonitorDown className="w-3.5 h-3.5" />
            <span>{isInstalled ? 'PC App Options' : 'Download for PC'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>History ({exportHistory.length})</span>
          </button>
        </div>
      </header>

      {/* ================= SUB-TAB RIBBON BAR UNDER ACTIVE CATEGORY ================= */}
      <div className="bg-slate-900 text-white px-6 py-2.5 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sub-Tabs for the active Main Category */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {categorySubTabs.map((tab) => {
              const isSelected = activeSubTab?.id === tab.id;
              const filledCount = tab.targetWords.filter(
                (r) => r.replacementValue.trim().length > 0
              ).length;

              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTabId(tab.id);
                    setActiveRuleId(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveSubTabId(tab.id);
                      setActiveRuleId(null);
                    }
                  }}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 opacity-80 shrink-0" />
                  <span className="truncate max-w-[200px]">{tab.title}</span>
                  <span
                    className={`text-[11px] font-mono-tabular ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {filledCount}/{tab.targetWords.length}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSubTab(tab.id, e)}
                    title={`Delete "${tab.title}" tab`}
                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isSelected
                        ? 'hover:bg-blue-700 text-blue-100'
                        : 'hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setIsAddSubTabModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 border border-dashed border-slate-700 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New {activeCategory.label} Tab</span>
            </button>
          </div>

          {/* Right Context: Default Scan Words Trigger */}
          <div className="flex items-center gap-3 text-xs text-slate-300 shrink-0">
            <button
              type="button"
              onClick={() => setIsDefaultsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-blue-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {activeCategory.label} Default Scan Words (
                {CATEGORY_DEFAULT_SCAN_WORDS[activeCategoryId].length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= NOTIFICATION / EXPORT BANNER ================= */}
      {recentExportBanner && (
        <div className="bg-emerald-900 text-emerald-50 px-6 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{recentExportBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecentExportBanner(null)}
            className="text-emerald-200 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= MAIN WORKSPACE SPLIT VIEWPORT ================= */}
      {activeSubTab ? (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-112px)]">
          {/* Left Column: Upload .docx, Scan Words, Input Replacements, Export / Print */}
          <div className="lg:col-span-5 xl:col-span-5 h-full lg:max-h-[calc(100vh-112px)] overflow-hidden">
            <WordScannerPanel
              fileName={activeSubTab.fileName}
              fileSize={activeSubTab.fileSize}
              lastModified={activeSubTab.lastModified}
              isCustomUploaded={activeSubTab.isCustomUploaded}
              paragraphs={activeSubTab.paragraphs}
              rules={activeSubTab.targetWords}
              activeRuleId={activeRuleId}
              onSelectRule={setActiveRuleId}
              onUpdateRuleValue={handleUpdateRuleValue}
              onUpdateRuleTarget={handleUpdateRuleTarget}
              onToggleRuleOption={handleToggleRuleOption}
              onAddRule={handleAddRule}
              onRemoveRule={handleRemoveRule}
              onClearAllValues={handleClearAllValues}
              onUploadDocxFile={handleUploadDocxIntoCurrentTab}
              onDownloadSourceTemplate={handleDownloadSourceTemplate}
              onExportProcessedDocx={handleExportProcessedDocx}
              onPrintProcessedDocx={() =>
                handlePrintTabsByIds([activeSubTab.id])
              }
              isExporting={isExporting}
            />
          </div>

          {/* Right Column: Interactive Word Document Live Preview */}
          <div className="lg:col-span-7 xl:col-span-7 h-full lg:max-h-[calc(100vh-112px)] overflow-hidden">
            <DocumentPaperPreview
              fileName={activeSubTab.fileName}
              subTabTitle={activeSubTab.title}
              categoryLabel={activeCategory.label}
              paragraphs={activeSubTab.paragraphs}
              rules={activeSubTab.targetWords}
              activeRuleId={activeRuleId}
              onSelectRule={(ruleId) => setActiveRuleId(ruleId)}
              onQuickAddWordFromSelection={(selectedWord) => {
                handleAddRule(selectedWord, '', false, false);
              }}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-112px)]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              No {activeCategory.label} Document Tabs Yet
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 mb-5">
              Add a document tab under {activeCategory.label} to upload, scan, replace words, download, or print a Word (.docx) document.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddSubTabModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add {activeCategory.label} Document Tab</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDefaultsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Default Scan Words</span>
              </button>
            </div>
          </div>
        </main>
      )}
      </div>

      {/* ================= ADD SUB-TAB MODAL ================= */}
      <AddSubTabModal
        isOpen={isAddSubTabModalOpen}
        activeCategory={activeCategory}
        onClose={() => setIsAddSubTabModalOpen(false)}
        onCreateSubTab={handleCreateSubTab}
      />

      {/* ================= CATEGORY DEFAULTS POP-UP MODAL (ALL 4 CATEGORIES) ================= */}
      <CorporationDefaultsModal
        isOpen={isDefaultsModalOpen}
        activeCategory={activeCategory}
        categoryTabs={categorySubTabs}
        initialValues={categoryDefaultEntries[activeCategoryId]}
        onClose={() => setIsDefaultsModalOpen(false)}
        onApplyDefaults={handleApplyCategoryDefaults}
        onExportAppliedTabs={handleExportAppliedCategoryTabs}
        onPrintAppliedTabs={handlePrintAppliedCategoryTabs}
      />

      {/* ================= DOWNLOADED & PRINTED DOCUMENTS HISTORY MODAL ================= */}
      <DownloadHistoryModal
        isOpen={isHistoryModalOpen}
        history={exportHistory}
        onClose={() => setIsHistoryModalOpen(false)}
        onClearHistory={() => setExportHistory([])}
        onRedownloadItem={handleRedownloadFromHistory}
        onReprintItem={handleReprintFromHistory}
      />

      {/* ================= DOWNLOAD FOR COMPUTER (PC) MODAL ================= */}
      <DownloadForPcModal
        isOpen={isDownloadForPcModalOpen}
        activeTabTitle={activeSubTab?.title || 'Document'}
        totalTabsCount={subTabs.length}
        onClose={() => setIsDownloadForPcModalOpen(false)}
        onDownloadWindowsInstaller={handleDownloadWindowsInstaller}
        onDownloadDesktopLauncher={handleDownloadDesktopLauncher}
        onDownloadAllAsZipForPc={handleDownloadAllAsZipForPc}
        onDownloadCurrentDocxToPc={handleExportProcessedDocx}
      />

      {/* ================= PC LOCAL PRINTER & BATCH PRINT MODAL ================= */}
      <LocalPrinterModal
        isOpen={isLocalPrinterModalOpen}
        activeCategory={activeCategory}
        allTabs={subTabs}
        activeTabId={activeSubTab?.id || ''}
        printerConfig={printerConfig}
        categoryCompanyMap={categoryCompanyMap}
        onUpdatePrinterConfig={setPrinterConfig}
        onClose={() => setIsLocalPrinterModalOpen(false)}
        onPrintTabs={handlePrintTabsByIds}
        onDownloadTabs={handleDownloadTabsByIds}
      />

      {/* ================= OPENED PROCESSED DOCUMENT PRINT VIEWER ================= */}
      <ProcessedDocumentPrintModal
        isOpen={isPrintViewerOpen}
        documents={openedPrintDocuments}
        printerConfig={printerConfig}
        isStandalonePrintWindow={isStandalonePrintRoute}
        onClose={() => {
          setIsPrintViewerOpen(false);
          if (isStandalonePrintRoute) {
            window.close();
          }
        }}
        onDownloadProcessedDocx={() => {
          const ids = openedPrintDocuments
            .map((d) => d.tabId)
            .filter((id): id is string => Boolean(id));
          if (ids.length > 0) {
            handleDownloadTabsByIds(ids);
          } else {
            handleExportProcessedDocx();
          }
        }}
        onOpenPrinterSettings={() => {
          setIsPrintViewerOpen(false);
          setIsLocalPrinterModalOpen(true);
        }}
      />

      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span>Offline Mode — Local workspace data is active.</span>
        </div>
      )}
    </div>
  );
}
