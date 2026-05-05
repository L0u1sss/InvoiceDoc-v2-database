import { z } from "zod";

export const salesPersonFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  start_work_date: z.string().optional(),
});
