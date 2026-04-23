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
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  noEmail?: boolean;
  idNumber?: string;
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
  status?: string;
  statusNotes?: string;
  registrationDate?: string;
  placedJob?: string;
  placedCompany?: string;
  tags?: string[];
  importBatchId?: string;
  source?: string;
  smooveSynced?: boolean;
  smooveSyncedAt?: string;
  smooveError?: string;
  smooveContactId?: number;
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

export function getCandidate(id: string) {
  return apiRequest<CandidateData>(`/api/candidates/${id}`);
}

export function createCandidate(data: Partial<CandidateData>) {
  return apiRequest<CandidateData>("/api/candidates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCandidate(id: string, data: Partial<CandidateData>) {
  return apiRequest<CandidateData>(`/api/candidates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface FilterOptions {
  cities: string[];
  sectors: string[];
  genders: string[];
  jobTypes: string[];
  jobPermanences: string[];
  tags: string[];
  statuses: string[];
  sources: string[];
}

export function syncCandidateToSmoove(id: string) {
  return apiRequest<{ smooveContactId?: number }>(`/api/candidates/${id}/sync-smoove`, {
    method: "POST",
  });
}

export interface StatsData {
  total: number;
  bySource: Record<string, number>;
  smoove: {
    synced: number;
    error: number;
    pending: number;
    noEmail: number;
  };
  topSectors: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  topStatuses: Array<{ name: string; count: number }>;
  recent: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    source?: string;
    createdAt: string;
  }>;
}

export function getCandidateStats() {
  return apiRequest<StatsData>("/api/candidates/stats");
}

export interface SyncPendingResult {
  attempted: number;
  synced: number;
  failed: number;
  limitHit: boolean;
  error?: string;
}

export function syncPendingToSmoove() {
  return apiRequest<SyncPendingResult>("/api/candidates/sync-smoove", {
    method: "POST",
    body: JSON.stringify({ max: 500 }),
  });
}

export function getPendingSmooveCount() {
  return apiRequest<{ pending: number }>("/api/candidates/sync-smoove");
}

export interface SmooveUsage {
  total: number;
  planLimit: number;
  remaining: number;
  percent: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

export function getSmooveUsage() {
  return apiRequest<SmooveUsage>("/api/smoove/usage");
}

export function getCandidateIds(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return apiRequest<{ ids: string[]; total: number }>(`/api/candidates/ids?${query}`);
}

export function importCandidates(formData: FormData) {
  return fetch(`${BASE_URL}/api/candidates/import`, {
    method: "POST",
    body: formData,
  }).then((r) => r.json() as Promise<ApiResponse<ImportResult>>);
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skippedNoEmail: number;
  errors: Array<{ row: number; reason: string }>;
  batchId: string;
  smooveSynced?: number;
  smooveFailed?: number;
  smooveLimitHit?: boolean;
  smooveError?: string;
}

export function getFilterOptions() {
  return apiRequest<FilterOptions>("/api/candidates/filters");
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

// Jobs
export interface JobListingData {
  _id: string;
  companyName: string;
  companyPhone?: string;
  sector?: string;
  workArea?: string;
  jobPermanence?: string;
  salary?: number;
  workDays?: string[];
  workHours?: string;
  contactName?: string;
  contactLastName?: string;
  contactGender?: string;
  contactPhone?: string;
  contactEmail?: string;
  type?: string;
  createdAt: string;
}

interface JobsListData {
  jobs: JobListingData[];
  total: number;
  page: number;
  totalPages: number;
}

export function getJobs(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return apiRequest<JobsListData>(`/api/jobs${query ? `?${query}` : ""}`);
}
