import z from "zod";
import { type C2PConfig } from "../types/internal";
import { C2PConfigSchema } from "../types/schema";

export const validateConfig = (config: C2PConfig) => {
  const tryValidate = C2PConfigSchema.safeParse(config);

  if (!tryValidate.success) {
    const { properties } = z.treeifyError(tryValidate.error);
    throw new Error(
      `Invalid configuration: ${JSON.stringify(properties, null, 2)}`
    );
  }

  return tryValidate.data;
};
