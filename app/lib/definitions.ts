export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type Resume = {
  id: string;
  user_id: string;
  title: string;
  original_content: string;
  optimized_content: string | null;
  job_description: string | null;
  score: number;
  status: "pending" | "analyzing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  original_file_url: string | null;
  original_file_type: "pdf" | "docx" | null;
  original_html: string | null;
};

export type ResumeSuggestion = {
  id: string;
  resume_id: string;
  category: string;
  original_text: string | null;
  suggested_text: string | null;
  reason: string | null;
  priority: "high" | "medium" | "low";
  is_applied: boolean;
  created_at: string;
};

export type ResumeReport = {
  id: string;
  resume_id: string;
  overall_score: number;
  content_score: number;
  format_score: number;
  keyword_score: number;
  experience_score: number;
  education_score: number;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
};
