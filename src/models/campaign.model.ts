import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  subject: string;
  htmlContent: string;
  status: "draft" | "sent" | "failed";
  smooveCampaignId?: number;
  recipientCount: number;
  candidateIds: mongoose.Types.ObjectId[];
  filters?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    subject: { type: String, required: true },
    htmlContent: { type: String, required: true },
    status: { type: String, enum: ["draft", "sent", "failed"], default: "draft" },
    smooveCampaignId: Number,
    recipientCount: { type: Number, default: 0 },
    candidateIds: [{ type: Schema.Types.ObjectId, ref: "Candidate" }],
    filters: { type: Schema.Types.Mixed },
    errorMessage: String,
  },
  { timestamps: true }
);

export const Campaign =
  mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);
