import { ObjectId } from "mongodb";
import { z } from "zod";

export const ScannedDocument = z.object({
  _id: z.instanceof(ObjectId),
  documentHash: z.string(),
  text: z.string(),
});

export type ScannedDocument = z.infer<typeof ScannedDocument>;
