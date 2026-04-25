import { z } from "zod";

export const candidateFormSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string().optional(),
  email: z
    .string()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "כתובת אימייל לא תקינה",
    }),
  phone: z.string(),
  age: z.string(),
  gender: z.string(),
  city: z.string(),
  address: z.string(),
  sectors: z.array(z.string()),
  jobType: z.string(),
  jobPermanence: z.string(),
  salaryExpectation: z.string(),
  freeText: z.string(),
  additionalInfo: z.string(),
  additionalNotes: z.string().optional(),
  motherTongue: z.string(),
  additionalLanguages: z.array(z.string()),
  additionalLanguagesText: z.string().optional(),
  idNumber: z.string().optional(),
  status: z.string().optional(),
  statusNotes: z.string().optional(),
  registrationDate: z.string().optional(),
  cvUrl: z.string().optional(),
  placedJob: z.string().optional(),
  placedCompany: z.string().optional(),
  firstPaymentDate: z.string().optional(),
  secondPaymentDate: z.string().optional(),
  workExperienceDetails: z.string().optional(),
  trainingDetails: z.string().optional(),
  hasWorkExperience: z.boolean().optional(),
  hasTraining: z.boolean().optional(),
  jobListingNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const jobFormSchema = z.object({
  title: z.string().min(1, "כותרת המשרה חובה"),
  description: z.string().optional(),
  jobNumber: z.string().optional(),

  companyName: z.string().min(1, "שם חברה חובה"),
  companyPhone: z.string().optional(),
  sector: z.string().optional(),
  workArea: z.string().optional(),
  jobType: z.string().optional(),
  jobPermanence: z.string().optional(),
  salary: z.string().optional(),
  workDays: z.array(z.string()).optional(),
  workHours: z.string().optional(),
  contactName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z
    .string()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "כתובת אימייל לא תקינה",
    })
    .optional(),

  urgent: z.boolean().optional(),
  status: z.enum(["draft", "open", "filled", "closed"]).optional(),
  publicVisible: z.boolean().optional(),
  paymentSchedule: z.enum(["one-installment", "two-installments"]).optional(),
  firstPaymentDays: z.union([z.literal(30), z.literal(90)]).optional(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const submissionStageSchema = z.object({
  stage: z.enum([
    "proposed",
    "cv_sent",
    "interview",
    "hired",
    "first_payment",
    "second_payment",
    "rejected",
  ]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type SubmissionStageValues = z.infer<typeof submissionStageSchema>;
