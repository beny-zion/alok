import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
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
  smooveContactId?: number;
  rawPayload: Record<string, unknown>;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: "" },
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
    jobListingNumber: Number,
    cvUrl: String,
    smooveContactId: Number,
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, default: "elementor-webhook" },
  },
  { timestamps: true }
);

// Text index for search
CandidateSchema.index({ firstName: "text", lastName: "text", email: "text", city: "text" });

export const Candidate =
  mongoose.models.Candidate || mongoose.model<ICandidate>("Candidate", CandidateSchema);
