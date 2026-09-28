export type MainCategoryId = 'corporation' | 'cooperative' | 'sole_proprietorship' | 'others';

export interface MainCategory {
  id: MainCategoryId;
  label: string;
  shortCode: string;
  description: string;
  regulatoryBody: string;
}

export interface TargetWordRule {
  id: string;
  targetWord: string; // The exact word, phrase, or placeholder scanned in the document
  replacementValue: string; // What the user inputted to replace it with
  label: string; // Human-friendly field label
  matchCount: number; // Number of occurrences found in the active Word document
  caseSensitive: boolean;
  wholeWord: boolean;
  isAutoDetected: boolean;
}

export interface DocxParagraph {
  id: string;
  text: string;
  style: 'title' | 'subtitle' | 'heading' | 'body' | 'signature' | 'table-row';
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  cells?: string[]; // If style === 'table-row'
}

export interface ExportHistoryItem {
  id: string;
  subTabId: string;
  subTabTitle: string;
  categoryLabel: string;
  companyName?: string;
  exportedFileName: string;
  actionType?: 'downloaded' | 'printed';
  printerName?: string;
  replacementsApplied: number;
  totalInstancesChanged: number;
  timestamp: string;
}

export interface LocalPrinterConfig {
  printerName: string;
  connectionType: 'system_spooler' | 'usb_direct' | 'network_ipp';
  paperSize: 'Letter' | 'Legal' | 'A4';
  copies: number;
  isConnected: boolean;
}

export interface DocumentSubTab {
  id: string;
  categoryId: MainCategoryId;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  lastModified: string;
  paragraphs: DocxParagraph[];
  targetWords: TargetWordRule[];
  docxBase64?: string;
  isCustomUploaded?: boolean;
}
