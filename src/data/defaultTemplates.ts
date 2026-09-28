import {
  DocumentSubTab,
  MainCategory,
  MainCategoryId,
} from '../types/document';

export const CATEGORY_DEFAULT_SCAN_WORDS: Record<
  MainCategoryId,
  readonly [string, string, string, string]
> = {
  corporation: [
    '(NAME OF CORPORATION)',
    '(Corporation Address)',
    '(TAXABLE DATE)',
    '(AUDITORS REPORT DATE)',
  ],
  cooperative: [
    '(NAME OF COOPERATIVE)',
    '(Cooperative Address)',
    '(TAXABLE DATE)',
    '(AUDITORS REPORT DATE)',
  ],
  sole_proprietorship: [
    '(NAME OF SOLE PROPRIETORSHIP)',
    '(Business Address)',
    '(TAXABLE DATE)',
    '(AUDITORS REPORT DATE)',
  ],
  others: [
    '(NAME OF COMPANY)',
    '(Company Address)',
    '(TAXABLE DATE)',
    '(AUDITORS REPORT DATE)',
  ],
};

export const CORPORATION_DEFAULT_SCAN_WORDS =
  CATEGORY_DEFAULT_SCAN_WORDS.corporation;

export const INITIAL_CATEGORY_DEFAULT_ENTRIES: Record<
  MainCategoryId,
  { scanWord: string; replaceText: string }[]
> = {
  corporation: [
    {
      scanWord: '(NAME OF CORPORATION)',
      replaceText: '',
    },
    {
      scanWord: '(Corporation Address)',
      replaceText: '',
    },
    {
      scanWord: '(TAXABLE DATE)',
      replaceText: '',
    },
    {
      scanWord: '(AUDITORS REPORT DATE)',
      replaceText: '',
    },
  ],
  cooperative: [
    {
      scanWord: '(NAME OF COOPERATIVE)',
      replaceText: '',
    },
    {
      scanWord: '(Cooperative Address)',
      replaceText: '',
    },
    {
      scanWord: '(TAXABLE DATE)',
      replaceText: '',
    },
    {
      scanWord: '(AUDITORS REPORT DATE)',
      replaceText: '',
    },
  ],
  sole_proprietorship: [
    {
      scanWord: '(NAME OF SOLE PROPRIETORSHIP)',
      replaceText: '',
    },
    {
      scanWord: '(Business Address)',
      replaceText: '',
    },
    {
      scanWord: '(TAXABLE DATE)',
      replaceText: '',
    },
    {
      scanWord: '(AUDITORS REPORT DATE)',
      replaceText: '',
    },
  ],
  others: [
    {
      scanWord: '(NAME OF COMPANY)',
      replaceText: '',
    },
    {
      scanWord: '(Company Address)',
      replaceText: '',
    },
    {
      scanWord: '(TAXABLE DATE)',
      replaceText: '',
    },
    {
      scanWord: '(AUDITORS REPORT DATE)',
      replaceText: '',
    },
  ],
};

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    id: 'corporation',
    label: 'Corporation',
    shortCode: 'CORP',
    description: '',
    regulatoryBody: '',
  },
  {
    id: 'cooperative',
    label: 'Cooperative',
    shortCode: 'COOP',
    description: '',
    regulatoryBody: '',
  },
  {
    id: 'sole_proprietorship',
    label: 'Sole Proprietorship',
    shortCode: 'SOLE',
    description: '',
    regulatoryBody: '',
  },
  {
    id: 'others',
    label: 'Others',
    shortCode: 'MISC',
    description: '',
    regulatoryBody: '',
  },
];

export const INITIAL_SUB_TABS: DocumentSubTab[] = [];
