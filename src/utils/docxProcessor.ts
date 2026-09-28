import JSZip from 'jszip';
import { DocxParagraph, TargetWordRule } from '../types/document';

/**
 * Escapes special characters for XML content
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escapes characters for RegExp construction
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a RegExp for a TargetWordRule
 */
export function buildRuleRegex(
  targetWord: string,
  caseSensitive: boolean,
  wholeWord: boolean
): RegExp | null {
  const trimmed = targetWord.trim();
  if (!trimmed) return null;
  const escaped = escapeRegExp(trimmed);
  const flags = caseSensitive ? 'g' : 'gi';
  if (wholeWord && /^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return new RegExp(`\\b${escaped}\\b`, flags);
  }
  return new RegExp(escaped, flags);
}

/**
 * Counts how many times a targetWord appears across all paragraphs & table cells
 */
export function countRuleMatches(
  paragraphs: DocxParagraph[],
  targetWord: string,
  caseSensitive: boolean,
  wholeWord: boolean
): number {
  const regex = buildRuleRegex(targetWord, caseSensitive, wholeWord);
  if (!regex) return 0;

  let total = 0;
  for (const p of paragraphs) {
    if (p.cells && p.cells.length > 0) {
      for (const cell of p.cells) {
        const matches = cell.match(regex);
        if (matches) total += matches.length;
      }
    } else {
      const matches = p.text.match(regex);
      if (matches) total += matches.length;
    }
  }
  return total;
}

/**
 * Recalculates match counts for all rules against the given paragraphs
 */
export function refreshRuleMatchCounts(
  paragraphs: DocxParagraph[],
  rules: TargetWordRule[]
): TargetWordRule[] {
  return rules.map((rule) => ({
    ...rule,
    matchCount: countRuleMatches(
      paragraphs,
      rule.targetWord,
      rule.caseSensitive,
      rule.wholeWord
    ),
  }));
}

/**
 * Converts a placeholder or phrase into a clean human-readable label
 */
export function formatTargetWordLabel(raw: string): string {
  const stripped = raw
    .replace(/^[\[\{\<\(\_]+|[\]\}\>\)\_]+$/g, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!stripped) return raw;
  return stripped
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Scans document paragraphs for bracketed/delimited placeholders AND frequent capitalized legal/entity terms
 */
export function autoScanDocumentWords(
  paragraphs: DocxParagraph[],
  existingRules: TargetWordRule[] = []
): TargetWordRule[] {
  const fullText = paragraphs
    .map((p) => (p.cells ? p.cells.join(' ') : p.text))
    .join('\n');

  const discoveredSet = new Set<string>();
  const rules: TargetWordRule[] = [];

  // Keep existing rules first with refreshed counts
  for (const existing of existingRules) {
    discoveredSet.add(existing.targetWord.toLowerCase());
    rules.push({
      ...existing,
      matchCount: countRuleMatches(
        paragraphs,
        existing.targetWord,
        existing.caseSensitive,
        existing.wholeWord
      ),
    });
  }

  // 1. Scan for delimited placeholders: (PLACEHOLDER), [PLACEHOLDER], {{PLACEHOLDER}}, <PLACEHOLDER>, __PLACEHOLDER__
  const placeholderPatterns = [
    /\(([A-Za-z0-9_ \-:/.,#]{2,45})\)/g,
    /\[([A-Za-z0-9_ \-:/.,#]{2,45})\]/g,
    /\{\{([A-Za-z0-9_ \-:/.,#]{2,45})\}\}/g,
    /<([A-Z0-9_ \-]{2,40})>/g,
    /__([A-Za-z0-9_ \-]{2,40})__/g,
  ];

  for (const pattern of placeholderPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const token = match[0].trim();
      if (!discoveredSet.has(token.toLowerCase())) {
        discoveredSet.add(token.toLowerCase());
        const count = countRuleMatches(paragraphs, token, false, false);
        if (count > 0) {
          rules.push({
            id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            targetWord: token,
            replacementValue: '',
            label: formatTargetWordLabel(token),
            matchCount: count,
            caseSensitive: false,
            wholeWord: false,
            isAutoDetected: true,
          });
        }
      }
    }
  }

  return rules;
}

/**
 * Applies all non-empty replacement rules to a string
 */
export function applyReplacementsToText(
  text: string,
  rules: TargetWordRule[]
): string {
  let result = text;
  const activeRules = rules.filter(
    (r) => r.targetWord.trim() !== '' && r.replacementValue.trim() !== ''
  );

  // Sort longer target words first to prevent partial sub-token collisions
  activeRules.sort((a, b) => b.targetWord.length - a.targetWord.length);

  for (const rule of activeRules) {
    const regex = buildRuleRegex(
      rule.targetWord,
      rule.caseSensitive,
      rule.wholeWord
    );
    if (regex) {
      result = result.replace(regex, () => rule.replacementValue);
    }
  }
  return result;
}

/**
 * Parses an uploaded .docx ArrayBuffer using JSZip and DOMParser
 */
export async function parseUploadedDocx(file: File): Promise<{
  paragraphs: DocxParagraph[];
  docxBase64: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error(
      'Invalid .docx file: word/document.xml was not found in the archive.'
    );
  }

  const xmlText = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.documentElement;
  const paragraphs: DocxParagraph[] = [];

  let pIndex = 0;

  // Iterate direct children of w:body to preserve order of paragraphs and tables
  const children = Array.from(body.childNodes);
  for (const node of children) {
    if (node.nodeName === 'w:p') {
      const textNodes = (node as Element).getElementsByTagName('w:t');
      let fullText = '';
      for (let i = 0; i < textNodes.length; i++) {
        fullText += textNodes[i].textContent || '';
      }
      const trimmed = fullText.trim();
      if (!trimmed) continue;

      // Detect alignment & style
      const jcEl = (node as Element).getElementsByTagName('w:jc')[0];
      const jcVal = jcEl?.getAttribute('w:val') || 'left';
      const pStyleEl = (node as Element).getElementsByTagName('w:pStyle')[0];
      const styleVal = pStyleEl?.getAttribute('w:val') || '';
      const hasBold = (node as Element).getElementsByTagName('w:b').length > 0;

      let style: DocxParagraph['style'] = 'body';
      if (
        pIndex === 0 &&
        (jcVal === 'center' ||
          styleVal.toLowerCase().includes('title') ||
          trimmed === trimmed.toUpperCase())
      ) {
        style = 'title';
      } else if (
        jcVal === 'center' &&
        trimmed.length < 95 &&
        (hasBold || trimmed === trimmed.toUpperCase())
      ) {
        style = 'subtitle';
      } else if (
        styleVal.toLowerCase().includes('heading') ||
        (hasBold && trimmed.length < 90 && !trimmed.endsWith('.'))
      ) {
        style = 'heading';
      } else if (
        trimmed.startsWith('IN WITNESS WHEREOF') ||
        trimmed.startsWith('SUBSCRIBED AND SWORN') ||
        trimmed.includes('________________')
      ) {
        style = 'signature';
      }

      const alignment: DocxParagraph['alignment'] =
        jcVal === 'center'
          ? 'center'
          : jcVal === 'right'
          ? 'right'
          : jcVal === 'both'
          ? 'justify'
          : 'left';

      paragraphs.push({
        id: `p-${pIndex++}`,
        text: fullText,
        style,
        alignment,
        bold: hasBold,
      });
    } else if (node.nodeName === 'w:tbl') {
      const rows = (node as Element).getElementsByTagName('w:tr');
      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r].getElementsByTagName('w:tc');
        const cellTexts: string[] = [];
        for (let c = 0; c < cells.length; c++) {
          const tNodes = cells[c].getElementsByTagName('w:t');
          let cellStr = '';
          for (let t = 0; t < tNodes.length; t++) {
            cellStr += tNodes[t].textContent || '';
          }
          cellTexts.push(cellStr.trim());
        }
        if (cellTexts.some((ct) => ct.length > 0)) {
          paragraphs.push({
            id: `tbl-${pIndex++}`,
            text: cellTexts.join(' | '),
            style: 'table-row',
            alignment: 'left',
            bold: r === 0,
            cells: cellTexts,
          });
        }
      }
    }
  }

  // Fallback if w:body direct children didn't capture nested paragraphs
  if (paragraphs.length === 0) {
    const allPs = xmlDoc.getElementsByTagName('w:p');
    for (let i = 0; i < allPs.length; i++) {
      const tNodes = allPs[i].getElementsByTagName('w:t');
      let str = '';
      for (let j = 0; j < tNodes.length; j++) {
        str += tNodes[j].textContent || '';
      }
      if (str.trim()) {
        paragraphs.push({
          id: `p-${i}`,
          text: str,
          style: i === 0 ? 'title' : 'body',
          alignment: i === 0 ? 'center' : 'justify',
        });
      }
    }
  }

  const docxBase64 = await zip.generateAsync({ type: 'base64' });
  return { paragraphs, docxBase64 };
}

/**
 * Builds a complete, valid OpenXML .docx archive from structured DocxParagraphs
 */
export async function generateDocxFromParagraphs(
  paragraphs: DocxParagraph[],
  rules: TargetWordRule[] = []
): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  zip.folder('word')?.folder('_rels')?.file(
    'document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // 4. word/styles.xml
  zip.folder('word')?.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // 5. Build word/document.xml body content
  const bodyXmlParts: string[] = [];
  let i = 0;

  while (i < paragraphs.length) {
    const p = paragraphs[i];

    // Group consecutive 'table-row' entries into a single <w:tbl>
    if (p.style === 'table-row' && p.cells) {
      const tableRowsXml: string[] = [];
      while (i < paragraphs.length && paragraphs[i].style === 'table-row' && paragraphs[i].cells) {
        const rowP = paragraphs[i];
        const cells = rowP.cells || [];
        const isHeader = rowP.bold;
        const cellsXml = cells
          .map((cellText) => {
            const replacedCell = escapeXml(applyReplacementsToText(cellText, rules));
            return `<w:tc>
              <w:tcPr>
                <w:tcBorders>
                  <w:top w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
                  <w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
                  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
                  <w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
                </w:tcBorders>
                <w:tcMar>
                  <w:top w:w="100" w:type="dxa"/>
                  <w:bottom w:w="100" w:type="dxa"/>
                  <w:left w:w="150" w:type="dxa"/>
                  <w:right w:w="150" w:type="dxa"/>
                </w:tcMar>
              </w:tcPr>
              <w:p>
                <w:r>
                  <w:rPr>${isHeader ? '<w:b/>' : ''}<w:sz w:val="21"/></w:rPr>
                  <w:t xml:space="preserve">${replacedCell}</w:t>
                </w:r>
              </w:p>
            </w:tc>`;
          })
          .join('');
        tableRowsXml.push(`<w:tr>${cellsXml}</w:tr>`);
        i++;
      }

      bodyXmlParts.push(`
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            </w:tblBorders>
          </w:tblPr>
          ${tableRowsXml.join('\n')}
        </w:tbl>
        <w:p><w:r><w:t></w:t></w:r></w:p>
      `);
      continue;
    }

    const replacedText = escapeXml(applyReplacementsToText(p.text, rules));
    const jcVal =
      p.alignment === 'center'
        ? 'center'
        : p.alignment === 'right'
        ? 'right'
        : p.alignment === 'justify'
        ? 'both'
        : 'left';

    const isBold = p.bold || p.style === 'title' || p.style === 'heading';
    const fontSizeHalfPts =
      p.style === 'title' ? '32' : p.style === 'subtitle' ? '24' : p.style === 'heading' ? '26' : '24';
    const spacingAfter = p.style === 'title' ? '160' : p.style === 'heading' ? '140' : '200';

    bodyXmlParts.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="${jcVal}"/>
          <w:spacing w:after="${spacingAfter}" w:line="276" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            ${isBold ? '<w:b/>' : ''}
            <w:sz w:val="${fontSizeHalfPts}"/>
            <w:szCs w:val="${fontSizeHalfPts}"/>
          </w:rPr>
          <w:t xml:space="preserve">${replacedText}</w:t>
        </w:r>
      </w:p>
    `);
    i++;
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXmlParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.folder('word')?.file('document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Exports a modified .docx file by applying replacement rules directly to the uploaded .docx XML
 * (or generating a fresh .docx if created from a built-in template)
 */
export async function exportModifiedDocx(
  paragraphs: DocxParagraph[],
  rules: TargetWordRule[],
  existingDocxBase64?: string
): Promise<Blob> {
  if (!existingDocxBase64) {
    return generateDocxFromParagraphs(paragraphs, rules);
  }

  try {
    const zip = await JSZip.loadAsync(existingDocxBase64, { base64: true });
    const xmlTargets = Object.keys(zip.files).filter(
      (path) =>
        path === 'word/document.xml' ||
        path.startsWith('word/header') ||
        path.startsWith('word/footer')
    );

    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    for (const xmlPath of xmlTargets) {
      const fileObj = zip.file(xmlPath);
      if (!fileObj) continue;

      const xmlContent = await fileObj.async('string');
      const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
      const wParagraphs = xmlDoc.getElementsByTagName('w:p');

      for (let i = 0; i < wParagraphs.length; i++) {
        const pEl = wParagraphs[i];
        const tNodes = pEl.getElementsByTagName('w:t');
        if (tNodes.length === 0) continue;

        // Combine all <w:t> text inside the paragraph so placeholders split across runs are replaced cleanly
        let combinedText = '';
        for (let t = 0; t < tNodes.length; t++) {
          combinedText += tNodes[t].textContent || '';
        }

        const replacedText = applyReplacementsToText(combinedText, rules);
        if (replacedText !== combinedText) {
          tNodes[0].textContent = replacedText;
          tNodes[0].setAttribute('xml:space', 'preserve');
          for (let t = 1; t < tNodes.length; t++) {
            tNodes[t].textContent = '';
          }
        }
      }

      const updatedXml = serializer.serializeToString(xmlDoc);
      zip.file(xmlPath, updatedXml);
    }

    return await zip.generateAsync({
      type: 'blob',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } catch {
    // Fallback to clean paragraph generator if custom XML manipulation encounters non-standard schemas
    return generateDocxFromParagraphs(paragraphs, rules);
  }
}

/**
 * Extracts the Company / Entity Name from the active replacement rules
 */
export function extractCompanyNameFromRules(
  rules: TargetWordRule[],
  fallbackCompanyName?: string
): string {
  const priorityKeywords = [
    'name of corporation',
    'name of cooperative',
    'name of sole proprietorship',
    'name of company',
    'corporation_name',
    'cooperative_name',
    'business_trade_name',
    'company_name',
    'entity_name',
    'trade_name',
  ];

  for (const keyword of priorityKeywords) {
    const found = rules.find(
      (r) =>
        r.targetWord.toLowerCase().includes(keyword) &&
        r.replacementValue.trim().length > 0
    );
    if (found) {
      return found.replacementValue.trim();
    }
  }

  if (fallbackCompanyName && fallbackCompanyName.trim().length > 0) {
    return fallbackCompanyName.trim();
  }

  const anyNameRule = rules.find(
    (r) =>
      r.targetWord.toLowerCase().includes('name') &&
      r.replacementValue.trim().length > 0
  );
  if (anyNameRule) {
    return anyNameRule.replacementValue.trim();
  }

  return '';
}

/**
 * Builds the exported .docx filename with the Company Name at the end of the .docx name
 */
export function buildExportDocxFileName(
  originalFileName: string,
  rules: TargetWordRule[],
  fallbackCompanyName?: string
): string {
  const baseName = originalFileName
    .replace(/\.docx$/i, '')
    .replace(/_Template$/i, '')
    .trim();

  const rawCompanyName = extractCompanyNameFromRules(
    rules,
    fallbackCompanyName
  );
  const safeCompanyName = rawCompanyName
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (safeCompanyName) {
    return `${baseName} - ${safeCompanyName}.docx`;
  }
  return `${baseName}.docx`;
}

/**
 * Triggers an immediate browser file download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const safeName = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
