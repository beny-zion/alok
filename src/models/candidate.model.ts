import mongoose, { Schema, Document } from "mongoose";

export interface ImportHistoryEntry {
  batchId: string;
  source: string;
  row: Record<string, unknown>;
  importedAt: Date;
}

export interface ICandidate extends Document {
  // All optional — allows import from heterogeneous sources
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

  sectors?: string[];
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
  additionalNotes?: string;
  additionalLanguagesText?: string;
  jobListingNumber?: number;
  cvUrl?: string;

  status?: string;
  statusNotes?: string;
  registrationDate?: Date;

  placedJob?: string;
  placedCompany?: string;
  firstPaymentDate?: Date;
  secondPaymentDate?: Date;

  tags?: string[];
  importBatchId?: string;

  smooveContactId?: number;
  smooveSynced?: boolean;
  smooveSyncedAt?: Date;
  smooveError?: string;
  rawPayload?: {
    webhook?: Record<string, unknown>;
    imports?: ImportHistoryEntry[];
    [key: string]: unknown;
  };
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    fullName: String,
    email: { type: String, index: true, sparse: true },
    phone: { type: String, default: "", index: true, sparse: true },
    noEmail: { type: Boolean, default: false },

    idNumber: { type: String, index: true, sparse: true },
    age: Number,
    gender: String,
    city: String,
    address: String,

    sectors: { type: [String], default: [] },
    jobType: String,
    jobPermanence: String,
    salaryExpectation: Number,

    freeText: String,
    motherTongue: String,
    additionalLanguages: { type: [String], default: [] },
    hasWorkExperience: Boolean,
    workExperienceDetails: String,
    hasTraining: Boolean,
    trainingDetails: String,
    additionalInfo: String,
    additionalNotes: String,
    additionalLanguagesText: String,
    jobListingNumber: Number,
    cvUrl: String,

    status: String,
    statusNotes: String,
    registrationDate: Date,

    placedJob: String,
    placedCompany: String,
    firstPaymentDate: Date,
    secondPaymentDate: Date,

    tags: { type: [String], default: [], index: true },
    importBatchId: String,

    smooveContactId: Number,
    smooveSynced: { type: Boolean, default: false, index: true },
    smooveSyncedAt: Date,
    smooveError: String,
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, default: "elementor-webhook" },
  },
  { timestamps: true }
);

CandidateSchema.index({ firstName: "text", lastName: "text", fullName: "text", email: "text", city: "text", phone: "text" });

export const Candidate =
  mongoose.models.Candidate || mongoose.model<ICandidate>("Candidate", CandidateSchema);
