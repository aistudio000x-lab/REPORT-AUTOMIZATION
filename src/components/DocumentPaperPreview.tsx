import React, { useState } from 'react';
import { DocxParagraph, TargetWordRule } from '../types/document';
import { escapeRegExp } from '../utils/docxProcessor';
import { Search, Check, Eye, FileCheck2 } from 'lucide-react';

interface DocumentPaperPreviewProps {
  fileName: string;
  subTabTitle: string;
  categoryLabel: string;
  paragraphs: DocxParagraph[];
  rules: TargetWordRule[];
  activeRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
  onQuickAddWordFromSelection: (selectedWord: string) => void;
}

interface TextSegment {
  text: string;
  matchedRule?: TargetWordRule;
}

/**
 * Splits a paragraph or table cell string into segments so matched target words can be highlighted
 * or live-replaced inline in the document preview.
 */
function segmentTextByRules(
  rawText: string,
  rules: TargetWordRule[]
): TextSegment[] {
  const validRules = rules
    .filter((r) => r.targetWord.trim().length > 0)
    .sort((a, b) => b.targetWord.length - a.targetWord.length);

  if (validRules.length === 0 || !rawText) {
    return [{ text: rawText }];
  }

  // Build combined alternation regex
  const patternParts = validRules.map((r) => {
    const escaped = escapeRegExp(r.targetWord.trim());
    if (r.wholeWord && /^[a-zA-Z0-9_]+$/.test(r.targetWord.trim())) {
      return `\\b${escaped}\\b`;
    }
    return escaped;
  });

  const combinedRegex = new RegExp(`(${patternParts.join('|')})`, 'gi');
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(rawText)) !== null) {
    const matchIndex = match.index;
    const matchedStr = match[0];

    if (matchIndex > lastIndex) {
      segments.push({ text: rawText.slice(lastIndex, matchIndex) });
    }

    // Find which rule matched
    const matchedRule = validRules.find((rule) => {
      const target = rule.targetWord.trim();
      if (rule.caseSensitive) {
        return matchedStr === target;
      }
      return matchedStr.toLowerCase() === target.toLowerCase();
    });

    if (matchedRule) {
      segments.push({ text: matchedStr, matchedRule });
    } else {
      segments.push({ text: matchedStr });
    }

    lastIndex = matchIndex + matchedStr.length;
  }

  if (lastIndex < rawText.length) {
    segments.push({ text: rawText.slice(lastIndex) });
  }

  return segments;
}

export const DocumentPaperPreview: React.FC<DocumentPaperPreviewProps> = ({
  fileName,
  subTabTitle,
  categoryLabel,
  paragraphs,
  rules,
  activeRuleId,
  onSelectRule,
  onQuickAddWordFromSelection,
}) => {
  const [previewMode, setPreviewMode] = useState<'highlighted' | 'clean'>('highlighted');
  const [selectedText, setSelectedText] = useState<string>('');

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (text && text.length >= 2 && text.length <= 65 && !text.includes('\n')) {
      setSelectedText(text);
    } else {
      setSelectedText('');
    }
  };

  const renderSegmentedInline = (content: string) => {
    const segments = segmentTextByRules(content, rules);
    return segments.map((seg, idx) => {
      if (!seg.matchedRule) {
        return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
      }

      const rule = seg.matchedRule;
      const hasReplacement = rule.replacementValue.trim().length > 0;
      const displayValue = hasReplacement ? rule.replacementValue : seg.text;
      const isFocused = activeRuleId === rule.id;

      if (previewMode === 'clean') {
        return <span key={idx}>{displayValue}</span>;
      }

      if (hasReplacement) {
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectRule(rule.id)}
            title={`Replaced "${seg.text}" → "${rule.replacementValue}" (Click to edit)`}
            className={`inline rounded px-1 py-0.5 font-medium transition-colors cursor-pointer ${
              isFocused
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-emerald-50 text-emerald-900 border-b-2 border-emerald-500 hover:bg-emerald-100'
            }`}
          >
            {displayValue}
          </button>
        );
      }

      return (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectRule(rule.id)}
          title={`Unfilled target word "${seg.text}" — Click to input replacement value`}
          className={`inline rounded px-1 py-0.5 transition-colors cursor-pointer ${
            isFocused
              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : 'bg-amber-50/90 text-amber-950 border-b-2 border-amber-400 hover:bg-amber-100'
          }`}
        >
          {seg.text}
        </button>
      );
    });
  };

  // Group consecutive table-row paragraphs for clean table rendering
  const renderedBlocks: React.ReactNode[] = [];
  let i = 0;

  while (i < paragraphs.length) {
    const p = paragraphs[i];

    if (p.style === 'table-row' && p.cells) {
      const tableRows: DocxParagraph[] = [];
      const startIdx = i;
      while (
        i < paragraphs.length &&
        paragraphs[i].style === 'table-row' &&
        paragraphs[i].cells
      ) {
        tableRows.push(paragraphs[i]);
        i++;
      }

      renderedBlocks.push(
        <div key={`tbl-wrap-${startIdx}`} className="my-5 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={row.id}
                  className={
                    row.bold || rIdx === 0
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'bg-white text-slate-800'
                  }
                >
                  {(row.cells || []).map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border border-slate-300 px-3 py-2 align-top leading-relaxed"
                    >
                      {renderSegmentedInline(cell)}
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

    if (p.style === 'title') {
      renderedBlocks.push(
        <h1
          key={p.id}
          className={`font-document text-xl sm:text-2xl font-semibold tracking-wide text-slate-950 mb-2 ${alignClass}`}
        >
          {renderSegmentedInline(p.text)}
        </h1>
      );
    } else if (p.style === 'subtitle') {
      renderedBlocks.push(
        <h2
          key={p.id}
          className={`font-document text-base sm:text-lg font-semibold text-slate-900 mb-6 ${alignClass}`}
        >
          {renderSegmentedInline(p.text)}
        </h2>
      );
    } else if (p.style === 'heading') {
      renderedBlocks.push(
        <h3
          key={p.id}
          className={`font-document text-sm sm:text-base font-semibold text-slate-900 mt-6 mb-2.5 ${alignClass}`}
        >
          {renderSegmentedInline(p.text)}
        </h3>
      );
    } else if (p.style === 'signature') {
      renderedBlocks.push(
        <p
          key={p.id}
          className={`font-document text-[15px] leading-[1.75] text-slate-900 mt-8 pt-4 border-t border-slate-200/80 ${alignClass}`}
        >
          {renderSegmentedInline(p.text)}
        </p>
      );
    } else {
      renderedBlocks.push(
        <p
          key={p.id}
          className={`font-document text-[15.5px] leading-[1.8] text-slate-800 mb-4 ${
            p.bold ? 'font-semibold text-slate-950' : ''
          } ${alignClass}`}
        >
          {renderSegmentedInline(p.text)}
        </p>
      );
    }

    i++;
  }

  const replacedCount = rules.filter((r) => r.replacementValue.trim().length > 0).length;
  const pendingCount = rules.length - replacedCount;

  return (
    <div className="flex flex-col h-full">
      {/* Preview Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <FileCheck2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 truncate">
            {fileName || 'No document uploaded'}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 truncate">
            {categoryLabel} / {subTabTitle}
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 font-mono-tabular hidden sm:inline">
            {replacedCount} replaced · {pendingCount} pending
          </span>
        </div>

        {/* Interactive View Switcher */}
        <div className="flex items-center gap-2">
          {selectedText && (
            <button
              type="button"
              onClick={() => {
                onQuickAddWordFromSelection(selectedText);
                setSelectedText('');
                window.getSelection()?.removeAllRanges();
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Scan &amp; Replace &ldquo;{selectedText.slice(0, 22)}&rdquo;</span>
            </button>
          )}

          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setPreviewMode('highlighted')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                previewMode === 'highlighted'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tracked Highlights</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('clean')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                previewMode === 'clean'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Clean Print View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Canvas Viewport */}
      <div
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80"
      >
        <div className="max-w-[780px] mx-auto bg-white border border-slate-200/90 shadow-xs px-8 sm:px-14 py-10 sm:py-14 min-h-[760px]">
          {paragraphs.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm text-slate-500">
                No readable paragraphs found in this document. Upload a Microsoft Word (.docx) file to scan and replace words.
              </p>
            </div>
          ) : (
            renderedBlocks
          )}
        </div>
      </div>
    </div>
  );
};
