import { z } from "zod";

export const CreateReceiptSchema = z.object({
  receipt_no: z.string().optional(), // Auto generated if missing
  receipt_date: z.string().min(8), // YYYY-MM-DD
  customer_code: z.string().min(1, "Customer code is required"),
  payment_method: z.enum(["Cash", "Bank transfer", "Check"]),
  notes: z.string().optional(),
  line_items: z
    .array(
      z.object({
        id: z.coerce.number().int().optional(), // receipt_line_item id if updating
        invoice_no: z.string().min(1, "Invoice number is required"),
        amount_received: z.coerce.number().nonnegative(),
      })
    )
    .min(1, "At least one invoice must be paid"),
});
