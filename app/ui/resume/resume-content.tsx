'use client';

import { useMemo, useState } from 'react';
import {
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

type ResumeSection = {
  title: string;
  content: string;
  icon: React.ElementType;
};

// Common resume section header patterns (Chinese + English)
const SECTION_PATTERNS: Array<{ pattern: RegExp; icon: React.ElementType }> = [
  {
    pattern:
      /^(个人信息|基本信息|联系方式|个人简介|personal\s*info|contact|profile|about\s*me)/i,
    icon: UserIcon,
  },
  {
    pattern:
      /^(工作经[历验]|项目经[历验]|实习经[历验]|work\s*experience|professional\s*experience|employment|projects?)/i,
    icon: BriefcaseIcon,
  },
  {
    pattern:
      /^(教育背景|教育经历|学历|education|academic)/i,
    icon: AcademicCapIcon,
  },
  {
    pattern:
      /^(技[能术]|专业技能|技术栈|skills?|technical\s*skills?|competenc)/i,
    icon: WrenchScrewdriverIcon,
  },
];

function getIconForSection(title: string): React.ElementType {
  for (const { pattern, icon } of SECTION_PATTERNS) {
    if (pattern.test(title.trim())) {
      return icon;
    }
  }
  return DocumentTextIcon;
}

function parseResumeIntoSections(content: string): ResumeSection[] {
  const lines = content.split('\n');
  const sections: ResumeSection[] = [];
  let currentTitle = '简历内容';
  let currentLines: string[] = [];

  // Heuristic: a line is a section header if it:
  // - Is relatively short (< 30 chars)
  // - Does not start with bullet-like characters
  // - Stands alone (previous and/or next line is blank)
  // - Or is in ALL CAPS / starts with common header markers
  const isHeader = (line: string, idx: number): boolean => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 40) return false;
    if (/^[-•·▪▸►➤→※*]/.test(trimmed)) return false;
    if (/^[\d]+[.\)、]/.test(trimmed)) return false;

    // Check for common header markers
    const hasHeaderMarker =
      /^[#]{1,3}\s/.test(trimmed) ||
      /^[【\[].*[】\]]$/.test(trimmed) ||
      /^={2,}/.test(trimmed) ||
      /^-{3,}/.test(lines[idx + 1]?.trim() || '') ||
      /^={3,}/.test(lines[idx + 1]?.trim() || '');

    if (hasHeaderMarker) return true;

    // Check if it matches known section patterns
    const cleanTitle = trimmed
      .replace(/^[#]+\s*/, '')
      .replace(/^[【\[]/, '')
      .replace(/[】\]]$/, '')
      .replace(/[:：]$/, '')
      .trim();
    for (const { pattern } of SECTION_PATTERNS) {
      if (pattern.test(cleanTitle)) return true;
    }

    // A short line surrounded by blank lines
    if (trimmed.length <= 20) {
      const prevBlank = idx === 0 || !lines[idx - 1]?.trim();
      const nextBlank =
        idx === lines.length - 1 || !lines[idx + 1]?.trim();
      if (prevBlank && nextBlank) return true;
    }

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    if (isHeader(lines[i], i)) {
      // Save previous section
      if (currentLines.length > 0 || sections.length > 0) {
        const content = currentLines.join('\n').trim();
        if (content) {
          sections.push({
            title: currentTitle,
            content,
            icon: getIconForSection(currentTitle),
          });
        }
      }

      // Clean up header title
      currentTitle = lines[i]
        .trim()
        .replace(/^[#]+\s*/, '')
        .replace(/^[【\[]/, '')
        .replace(/[】\]]$/, '')
        .replace(/[:：]$/, '')
        .trim();
      currentLines = [];

      // Skip separator line after header
      if (
        i + 1 < lines.length &&
        /^[-=]{3,}$/.test(lines[i + 1]?.trim() || '')
      ) {
        i++;
      }
    } else {
      currentLines.push(lines[i]);
    }
  }

  // Push last section
  const lastContent = currentLines.join('\n').trim();
  if (lastContent) {
    sections.push({
      title: currentTitle,
      content: lastContent,
      icon: getIconForSection(currentTitle),
    });
  }

  // If no sections were detected, put everything in a single section
  if (sections.length === 0) {
    sections.push({
      title: '简历内容',
      content: content.trim(),
      icon: DocumentTextIcon,
    });
  }

  return sections;
}

function SectionCard({ section }: { section: ResumeSection }) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = section.icon;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <Icon className="h-5 w-5 text-blue-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-700 flex-1">
          {section.title}
        </span>
        {collapsed ? (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronUpIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function ResumeContent({ content }: { content: string }) {
  const sections = useMemo(
    () => parseResumeIntoSections(content),
    [content],
  );

  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <SectionCard key={`${section.title}-${i}`} section={section} />
      ))}
    </div>
  );
}
