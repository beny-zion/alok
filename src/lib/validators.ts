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
