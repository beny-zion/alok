import mongoose, { Schema, Document } from "mongoose";

export type JobStatus = "draft" | "open" | "filled" | "closed";
export type PaymentSchedule = "one-installment" | "two-installments";

export interface IJobListing extends Document {
  title?: string;
  description?: string;
  jobNumber?: string;

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

  urgent: boolean;
  status: JobStatus;
  publicVisible: boolean;
  paymentSchedule: PaymentSchedule;
  firstPaymentDays: 30 | 90;
  placementsCount: number;

  rawPayload?: Record<string, unknown>;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobListingSchema = new Schema<IJobListing>(
  {
    title: String,
    description: String,
    jobNumber: { type: String, index: { unique: true, sparse: true } },

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

    urgent: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["draft", "open", "filled", "closed"],
      default: "open",
      index: true,
    },
    publicVisible: { type: Boolean, default: false },
    paymentSchedule: {
      type: String,
      enum: ["one-installment", "two-installments"],
      default: "two-installments",
    },
    firstPaymentDays: { type: Number, enum: [30, 90], default: 90 },
    placementsCount: { type: Number, default: 0 },

    rawPayload: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, default: "elementor-webhook" },
  },
  { timestamps: true }
);

JobListingSchema.index({ publicVisible: 1, status: 1, createdAt: -1 });

// Force fresh schema on every module load. Without this, Next.js dev-server HMR keeps a
// stale cached model in `mongoose.models.JobListing` after fields are added — Mongoose's
// default strict mode then silently strips the new fields from $set updates.
if (mongoose.models.JobListing) {
  delete (mongoose.models as Record<string, unknown>).JobListing;
}

export const JobListing = mongoose.model<IJobListing>("JobListing", JobListingSchema);
