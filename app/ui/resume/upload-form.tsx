'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createResume } from '@/app/lib/resume-actions';
import { Button } from '@/app/ui/button';
import {
  ExclamationCircleIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPT_STRING =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx';

function getFileTypeLabel(type: string): string {
  if (type === 'application/pdf') return 'PDF';
  if (
    type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'Word';
  return '文件';
}

export default function UploadForm() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('请上传 PDF 或 Word (.docx) 格式的文件');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return false;
    }
    return true;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setUploadFile(file);
        setError(null);
      }
    },
    [validateFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setUploadFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const title = (
      form.elements.namedItem('title') as HTMLInputElement
    )?.value?.trim();
    const jobDescription =
      (
        form.elements.namedItem('jobDescription') as HTMLTextAreaElement
      )?.value?.trim() || undefined;

    if (!uploadFile) {
      setError('请选择要上传的文件');
      setIsSubmitting(false);
      return;
    }

    // Parse the file
    setIsParsing(true);
    let originalContent: string;
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', uploadFile);
      const res = await fetch('/api/resume/parse-file', {
        method: 'POST',
        body: fileFormData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '文件解析失败');
        setIsSubmitting(false);
        setIsParsing(false);
        return;
      }
      originalContent = data.text as string;
    } catch {
      setError('文件解析失败，请重试');
      setIsSubmitting(false);
      setIsParsing(false);
      return;
    }
    setIsParsing(false);

    // Build FormData
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

    // Redirect to detail page; analysis will be triggered there via streaming
    router.push(`/dashboard/resume/${result.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          上传简历 <span className="text-red-500">*</span>
        </label>

        {uploadFile ? (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <DocumentIcon className="h-8 w-8 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {uploadFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {getFileTypeLabel(uploadFile.type)} ·{' '}
                {(uploadFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="shrink-0 rounded-md p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="移除文件"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
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
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                点击或拖拽上传简历文件
              </p>
              <p className="text-xs text-gray-500 mt-1">
                支持 PDF、Word (.docx) 格式，最大 10MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Job description */}
      <div>
        <label
          htmlFor="jobDescription"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          目标岗位描述{' '}
          <span className="text-gray-400 font-normal">
            （可选，填写后AI将针对性优化）
          </span>
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

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full justify-center"
      >
        {isParsing
          ? '解析文件中...'
          : isSubmitting
            ? '上传中...'
            : '开始分析'}
      </Button>
    </form>
  );
}
