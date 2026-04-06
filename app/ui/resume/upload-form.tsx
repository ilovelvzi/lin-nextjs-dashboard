'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createResume } from '@/app/lib/resume-actions';
import { Button } from '@/app/ui/button';
import { ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

type Tab = 'text' | 'pdf';

export default function UploadForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('text');
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
    } else {
      setError('请上传PDF格式的文件');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement)?.value?.trim();
    const jobDescription = (form.elements.namedItem('jobDescription') as HTMLTextAreaElement)?.value?.trim() || undefined;

    let originalContent: string;

    if (tab === 'text') {
      originalContent = (form.elements.namedItem('originalContent') as HTMLTextAreaElement)?.value?.trim() || '';
      if (!originalContent) {
        setError('请输入简历内容');
        setIsSubmitting(false);
        return;
      }
    } else {
      // PDF mode — parse the file first
      if (!pdfFile) {
        setError('请选择PDF文件');
        setIsSubmitting(false);
        return;
      }
      setIsParsing(true);
      try {
        const pdfFormData = new FormData();
        pdfFormData.append('file', pdfFile);
        const res = await fetch('/api/resume/parse-pdf', {
          method: 'POST',
          body: pdfFormData,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'PDF解析失败');
          setIsSubmitting(false);
          setIsParsing(false);
          return;
        }
        originalContent = data.text as string;
      } catch {
        setError('PDF解析失败，请重试');
        setIsSubmitting(false);
        setIsParsing(false);
        return;
      }
      setIsParsing(false);
    }

    // Build FormData manually to avoid hidden-field workarounds
    const formData = new FormData();
    formData.set('title', title);
    formData.set('originalContent', originalContent);
    if (jobDescription) formData.set('jobDescription', jobDescription);

    const result = await createResume(formData);

    if ('error' in result) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    // Trigger analysis in background
    const resumeId = result.id;

    fetch('/api/resume/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeContent: originalContent, jobDescription: jobDescription || undefined, resumeId }),
    }).catch(console.error);

    router.push(`/dashboard/resume/${resumeId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          简历标题 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="例如：前端工程师简历 2024"
          className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-2 placeholder:text-gray-400 focus:border-blue-500"
        />
      </div>

      {/* Tab switcher */}
      <div>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            粘贴文本
          </button>
          <button
            type="button"
            onClick={() => setTab('pdf')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            上传 PDF
          </button>
        </div>

        {/* Text input */}
        {tab === 'text' && (
          <div className="mt-3">
            <textarea
              name="originalContent"
              rows={14}
              placeholder="请将您的简历内容粘贴到这里..."
              className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-2 placeholder:text-gray-400 focus:border-blue-500 resize-y"
            />
          </div>
        )}

        {/* PDF upload */}
        {tab === 'pdf' && (
          <div className="mt-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
              {pdfFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">{pdfFile.name}</p>
                  <p className="text-xs text-gray-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">点击或拖拽上传PDF简历</p>
                  <p className="text-xs text-gray-500 mt-1">支持最大10MB的PDF文件</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Job description */}
      <div>
        <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-1">
          目标岗位描述 <span className="text-gray-400 font-normal">（可选，填写后AI将针对性优化）</span>
        </label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows={5}
          placeholder="粘贴目标岗位的职位描述，AI将根据岗位要求优化您的简历..."
          className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-2 placeholder:text-gray-400 focus:border-blue-500 resize-y"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
        {isParsing ? '解析PDF中...' : isSubmitting ? '上传中...' : '开始分析'}
      </Button>
    </form>
  );
}
