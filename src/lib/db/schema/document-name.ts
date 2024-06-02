import { ObjectId } from "mongodb";
import { z } from "zod";

export const DocumentName = z.object({
  _id: z.instanceof(ObjectId),
  documentHash: z.string(),
  name: z.string(),
});

export type DocumentName = z.infer<typeof DocumentName>;
