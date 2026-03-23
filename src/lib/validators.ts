import { z } from "zod";

export const candidateFormSchema = z.object({
  firstName: z.string().min(1, "שם פרטי הוא שדה חובה"),
  lastName: z.string(),
  email: z.string().email("כתובת אימייל לא תקינה"),
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
  motherTongue: z.string(),
  additionalLanguages: z.array(z.string()),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;
