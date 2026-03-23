import mongoose, { Schema, Document } from "mongoose";

export interface IJobListing extends Document {
  companyName: string;
  companyPhone?: string;
  sector?: string;
  workArea?: string;
  jobType?: string;
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
  rawPayload?: Record<string, unknown>;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobListingSchema = new Schema<IJobListing>(
  {
    companyName: { type: String, required: true },
    companyPhone: String,
    sector: String,
    workArea: String,
    jobType: String,
    jobPermanence: String,
    salary: Number,
    workDays: { type: [String], default: [] },
    workHours: String,
    contactName: String,
    contactLastName: String,
    contactGender: String,
    contactPhone: String,
    contactEmail: { type: String, index: true },
    type: String,
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, default: "elementor-webhook" },
  },
  { timestamps: true }
);

export const JobListing =
  mongoose.models.JobListing || mongoose.model<IJobListing>("JobListing", JobListingSchema);
