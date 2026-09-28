import React, { useState, useRef } from 'react';
import { DocxParagraph, TargetWordRule } from '../types/document';
import { countRuleMatches, formatTargetWordLabel } from '../utils/docxProcessor';
import {
  Upload,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  FileDown,
  SlidersHorizontal,
  Printer,
} from 'lucide-react';

interface WordScannerPanelProps {
  fileName: string;
  fileSize: number;
  lastModified: string;
  isCustomUploaded?: boolean;
  paragraphs: DocxParagraph[];
  rules: TargetWordRule[];
  activeRuleId: string | null;
  onSelectRule: (ruleId: string | null) => void;
  onUpdateRuleValue: (ruleId: string, newValue: string) => void;
  onUpdateRuleTarget: (ruleId: string, newTargetWord: string) => void;
  onToggleRuleOption: (
    ruleId: string,
    field: 'caseSensitive' | 'wholeWord'
  ) => void;
  onAddRule: (
    targetWord: string,
    replacementValue: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ) => void;
  onRemoveRule: (ruleId: string) => void;
  onClearAllValues: () => void;
  onUploadDocxFile: (file: File) => Promise<void>;
  onDownloadSourceTemplate: () => Promise<void>;
  onExportProcessedDocx: () => Promise<void>;
  onPrintProcessedDocx: () => void;
  isExporting: boolean;
}

export const WordScannerPanel: React.FC<WordScannerPanelProps> = ({
  fileName,
  paragraphs,
  rules,
  activeRuleId,
  onSelectRule,
  onUpdateRuleValue,
  onUpdateRuleTarget,
  onToggleRuleOption,
  onAddRule,
  onRemoveRule,
  onClearAllValues,
  onUploadDocxFile,
  onDownloadSourceTemplate,
  onExportProcessedDocx,
  onPrintProcessedDocx,
  isExporting,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Custom word scan inputs
  const [newTargetWord, setNewTargetWord] = useState('');
  const [newReplacementValue, setNewReplacementValue] = useState('');
  const [newCaseSensitive, setNewCaseSensitive] = useState(false);
  const [newWholeWord, setNewWholeWord] = useState(false);

  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'filled' | 'unfilled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const liveNewWordCount = newTargetWord.trim()
    ? countRuleMatches(
        paragraphs,
        newTargetWord,
        newCaseSensitive,
        newWholeWord
      )
    : 0;

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('Please select a valid Microsoft Word (.docx) file.');
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      await onUploadDocxFile(file);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Could not read the uploaded .docx file.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddCustomWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTargetWord.trim();
    if (!trimmed) return;
    onAddRule(trimmed, newReplacementValue, newCaseSensitive, newWholeWord);
    setNewTargetWord('');
    setNewReplacementValue('');
  };

  const filteredRules = rules.filter((rule) => {
    const isFilled = rule.replacementValue.trim().length > 0;
    if (filterMode === 'filled' && !isFilled) return false;
    if (filterMode === 'unfilled' && isFilled) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        rule.targetWord.toLowerCase().includes(q) ||
        rule.label.toLowerCase().includes(q) ||
        rule.replacementValue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeReplacementsCount = rules.filter(
    (r) => r.replacementValue.trim().length > 0
  ).length;
  const totalInstancesReplaced = rules.reduce(
    (acc, r) => (r.replacementValue.trim() ? acc + r.matchCount : acc),
    0
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* 1. Document File Upload & Source Controls */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-900">
            01. Active Word Document (.docx)
          </span>
          {paragraphs.length > 0 && (
            <button
              type="button"
              onClick={onDownloadSourceTemplate}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap"
            >
              Download Original .docx
            </button>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files?.[0];
            handleFileChange(droppedFile);
          }}
          className={`p-3.5 rounded-lg border border-dashed transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/60'
              : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {fileName || 'No Word (.docx) document uploaded yet'}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>{isUploading ? 'Scanning...' : 'Upload .docx'}</span>
            </button>
          </div>

          {uploadError && (
            <p className="mt-2 text-xs text-red-600 font-medium">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* 2. Scan & Add Custom Word / Phrase Form */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-900">
            02. Scan Specific Word or Phrase
          </span>
          {newTargetWord.trim() && (
            <span
              className={`text-xs font-mono-tabular ${
                liveNewWordCount > 0 ? 'text-emerald-700 font-medium' : 'text-amber-700'
              }`}
            >
              {liveNewWordCount} {liveNewWordCount === 1 ? 'match' : 'matches'} in doc
            </span>
          )}
        </div>

        <form onSubmit={handleAddCustomWordSubmit} className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Word in Document to Find
              </label>
              <input
                type="text"
                value={newTargetWord}
                onChange={(e) => setNewTargetWord(e.target.value)}
                placeholder="Enter word or phrase..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Change To (Replacement Input)
              </label>
              <input
                type="text"
                value={newReplacementValue}
                onChange={(e) => setNewReplacementValue(e.target.value)}
                placeholder="Enter new text..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newCaseSensitive}
                  onChange={(e) => setNewCaseSensitive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Match case</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newWholeWord}
                  onChange={(e) => setNewWholeWord(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Whole word</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!newTargetWord.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Word Rule</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Scanned Words Filter & Actions Bar */}
      <div className="px-4 py-2.5 border-b border-slate-200 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-900">
            03. Scanned Words &amp; Replacements ({rules.length})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearAllValues}
              title="Clear all replacement input values"
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Inputs</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/70">
            {(['all', 'filled', 'unfilled'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-xs capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === mode
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Search Filter */}
          <div className="relative flex-1 max-w-[190px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter fields..."
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* 4. Scrollable Word Replacement Inputs */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80">
        {filteredRules.length === 0 ? (
          <div className="p-8 text-center">
            <SlidersHorizontal className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 mb-1">
              No matching target words shown
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Use &ldquo;Scan Specific Word or Phrase&rdquo; above to add target words in this document.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          filteredRules.map((rule, idx) => {
            const isFilled = rule.replacementValue.trim().length > 0;
            const isSelected = activeRuleId === rule.id;

            return (
              <div
                key={rule.id}
                onClick={() => onSelectRule(rule.id)}
                className={`p-3.5 transition-colors ${
                  isSelected
                    ? 'bg-blue-50/50'
                    : isFilled
                    ? 'bg-emerald-50/15 hover:bg-slate-50'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                {/* Top Metadata Row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono-tabular text-slate-400">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {formatTargetWordLabel(rule.targetWord)}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span
                      className={`text-[11px] font-mono-tabular whitespace-nowrap ${
                        rule.matchCount > 0 ? 'text-slate-600' : 'text-amber-600'
                      }`}
                    >
                      {rule.matchCount} {rule.matchCount === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRuleOption(rule.id, 'caseSensitive');
                      }}
                      title="Toggle Case Sensitivity"
                      className={`px-1.5 py-0.5 text-[10px] font-mono-tabular rounded border transition-colors cursor-pointer ${
                        rule.caseSensitive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRuleOption(rule.id, 'wholeWord');
                      }}
                      title="Toggle Whole Word Match"
                      className={`px-1.5 py-0.5 text-[10px] font-mono-tabular rounded border transition-colors cursor-pointer ${
                        rule.wholeWord
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      [W]
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRule(rule.id);
                      }}
                      title="Remove target word rule"
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Target Word -> Replacement Input Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={rule.targetWord}
                      onChange={(e) =>
                        onUpdateRuleTarget(rule.id, e.target.value)
                      }
                      aria-label="Target word in document"
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-slate-100/90 border border-slate-200 rounded-md text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={rule.replacementValue}
                      onChange={(e) =>
                        onUpdateRuleValue(rule.id, e.target.value)
                      }
                      placeholder={`Replace ${rule.targetWord} with...`}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-md border transition-colors focus:outline-none ${
                        isFilled
                          ? 'bg-white border-emerald-500 text-slate-950 font-medium focus:border-blue-600'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Sticky Bottom Export & Download Bar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2.5 font-mono-tabular">
          <span>
            {activeReplacementsCount} of {rules.length} rules filled
          </span>
          <span>·</span>
          <span>{totalInstancesReplaced} word instances updated</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <button
            type="button"
            disabled={isExporting || paragraphs.length === 0}
            onClick={onExportProcessedDocx}
            className="sm:col-span-7 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>
              {isExporting ? 'Exporting .docx...' : 'Download Processed (.docx)'}
            </span>
          </button>

          <button
            type="button"
            disabled={paragraphs.length === 0}
            onClick={onPrintProcessedDocx}
            className="sm:col-span-5 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Print Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
