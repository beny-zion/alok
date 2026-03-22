const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

// Candidates
export interface CandidateData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  city?: string;
  address?: string;
  sectors: string[];
  jobType?: string;
  jobPermanence?: string;
  salaryExpectation?: number;
  freeText?: string;
  motherTongue?: string;
  additionalLanguages?: string[];
  hasWorkExperience?: boolean;
  workExperienceDetails?: string;
  hasTraining?: boolean;
  trainingDetails?: string;
  additionalInfo?: string;
  jobListingNumber?: number;
  cvUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CandidatesListData {
  candidates: CandidateData[];
  total: number;
  page: number;
  totalPages: number;
}

export function getCandidates(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return apiRequest<CandidatesListData>(`/api/candidates?${query}`);
}

export function deleteCandidate(id: string) {
  return apiRequest(`/api/candidates/${id}`, { method: "DELETE" });
}

// Campaigns
export interface CampaignData {
  _id: string;
  subject: string;
  htmlContent: string;
  status: "draft" | "sent" | "failed";
  smooveCampaignId?: number;
  recipientCount: number;
  errorMessage?: string;
  createdAt: string;
}

export function getCampaigns() {
  return apiRequest<CampaignData[]>("/api/campaigns");
}

export function createCampaign(data: {
  subject: string;
  htmlContent: string;
  candidateIds: string[];
  filters?: Record<string, unknown>;
}) {
  return apiRequest<CampaignData>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
