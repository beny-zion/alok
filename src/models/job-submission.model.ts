import mongoose, { Schema, Document, Types } from "mongoose";
import { JobListing } from "./job-listing.model";

export type SubmissionStage =
  | "proposed"
  | "cv_sent"
  | "interview"
  | "hired"
  | "first_payment"
  | "second_payment"
  | "rejected";

export const STAGE_ORDER: SubmissionStage[] = [
  "proposed",
  "cv_sent",
  "interview",
  "hired",
  "first_payment",
  "second_payment",
  "rejected",
];

export const STAGE_LABELS: Record<SubmissionStage, string> = {
  proposed: "הוצע",
  cv_sent: 'קו"ח נשלח',
  interview: "בראיון",
  hired: "התקבל",
  first_payment: "פעימה ראשונה",
  second_payment: "פעימה שנייה",
  rejected: "לא התאים",
};

export interface IJobSubmission extends Document {
  candidateId: Types.ObjectId;
  jobListingId: Types.ObjectId;
  stage: SubmissionStage;
  proposedAt?: Date;
  cvSentAt?: Date;
  interviewAt?: Date;
  hiredAt?: Date;
  firstPaymentAt?: Date;
  secondPaymentAt?: Date;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSubmissionSchema = new Schema<IJobSubmission>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    jobListingId: {
      type: Schema.Types.ObjectId,
      ref: "JobListing",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: STAGE_ORDER,
      default: "proposed",
      index: true,
    },
    proposedAt: { type: Date, default: () => new Date() },
    cvSentAt: Date,
    interviewAt: Date,
    hiredAt: Date,
    firstPaymentAt: Date,
    secondPaymentAt: Date,
    notes: String,
    rejectionReason: String,
  },
  { timestamps: true }
);

JobSubmissionSchema.index({ candidateId: 1, jobListingId: 1 }, { unique: true });
JobSubmissionSchema.index({ jobListingId: 1, stage: 1 });
JobSubmissionSchema.index({ stage: 1, hiredAt: -1 });

// Stamp transition timestamps and remember if "hiredAt" was set in this save
// so the post-save hook can bump placementsCount exactly once per submission.
JobSubmissionSchema.pre("save", function (next) {
  const doc = this as IJobSubmission & {
    _justHired?: boolean;
    isModified: (path: string) => boolean;
  };
  doc._justHired = false;
  if (doc.isModified("stage")) {
    if (doc.stage === "cv_sent" && !doc.cvSentAt) doc.cvSentAt = new Date();
    if (doc.stage === "interview" && !doc.interviewAt) doc.interviewAt = new Date();
    if (doc.stage === "hired" && !doc.hiredAt) {
      doc.hiredAt = new Date();
      doc._justHired = true;
    }
    if (doc.stage === "first_payment" && !doc.firstPaymentAt) {
      doc.firstPaymentAt = new Date();
      if (!doc.hiredAt) {
        doc.hiredAt = new Date();
        doc._justHired = true;
      }
    }
    if (doc.stage === "second_payment" && !doc.secondPaymentAt) {
      doc.secondPaymentAt = new Date();
      if (!doc.hiredAt) {
        doc.hiredAt = new Date();
        doc._justHired = true;
      }
    }
  }
  next();
});

JobSubmissionSchema.post("save", async function (doc) {
  const justHired = (doc as IJobSubmission & { _justHired?: boolean })._justHired;
  if (justHired) {
    await JobListing.findByIdAndUpdate(doc.jobListingId, {
      $inc: { placementsCount: 1 },
      status: "filled",
    }).exec();
  }
});

export const JobSubmission =
  mongoose.models.JobSubmission ||
  mongoose.model<IJobSubmission>("JobSubmission", JobSubmissionSchema);
