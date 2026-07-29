import z from "zod";

const stageSchema = z.enum(["production", "sandbox"]);

export type StageInfer = z.infer<typeof stageSchema>;

export const C2PConfigSchema = z
  .object({
    transactionId: z.string().min(1, "Transaction ID is required"),
    locale: z
      .string()
      .regex(
        /^[a-z]{2}_[A-Z]{2}$/,
        "Locale must be in ISO format (e.g. 'pl_PL')"
      ),
    stage: stageSchema,
    amount: z
      .number()
      .positive("Amount must be positive")
      .int("Amount must be in minor units (e.g. 5000 for 50.00 PLN)"),
    currency: z
      .string()
      .length(3, "Currency must be 3-letter ISO code")
      .regex(/^[A-Z]{3}$/, "Currency must be uppercase ISO code (e.g. 'PLN')"),
    email: z.email("Invalid email format").optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{8,14}$/, "Invalid phone number format")
      .optional(),
  })
  .refine(
    (data) => data.email || data.phone,
    "Either email or phone must be provided"
  );

export type C2PConfigInfer = z.infer<typeof C2PConfigSchema>;
