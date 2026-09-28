import React, { useState, useRef } from 'react';
import { MainCategory } from '../types/document';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';

interface AddSubTabModalProps {
  isOpen: boolean;
  activeCategory: MainCategory;
  onClose: () => void;
  onCreateSubTab: (params: {
    title: string;
    description: string;
    uploadedFile?: File;
  }) => Promise<void>;
}

export const AddSubTabModal: React.FC<AddSubTabModalProps> = ({
  isOpen,
  activeCategory,
  onClose,
  onCreateSubTab,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Only Microsoft Word (.docx) files are supported.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.docx$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      setTitle(cleanName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a sub-tab title.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreateSubTab({
        title: title.trim(),
        description:
          description.trim() ||
          `Custom ${activeCategory.label} Word document template`,
        uploadedFile: selectedFile,
      });
      setTitle('');
      setDescription('');
      setSelectedFile(undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create document tab.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Add New Document Tab under {activeCategory.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Sub-Tab Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sub-tab name..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Document Purpose / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note on what this Word template is used for..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 text-slate-900"
            />
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            <div
              onClick={() => fileRef.current?.click()}
              className={`p-4 border border-dashed rounded-lg cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-500'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-tabular">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Ready to scan words
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(undefined);
                    }}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Click to choose a .docx Word document from your computer
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {isSubmitting ? 'Creating Tab...' : 'Create Document Tab'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
