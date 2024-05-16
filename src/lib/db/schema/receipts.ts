import { ObjectId } from "mongodb";
import { z } from "zod";

export const ReceiptEmbedding = z.object({
  _id: z.instanceof(ObjectId),
  documentHash: z.string(),
  type: z.string(),
  languageCode: z.string(),
  text: z.string(),
  embedding: z.number().array(),
});

export type ReceiptEmbedding = z.infer<typeof ReceiptEmbedding>;

export const ReceiptItem = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  metadata: z.unknown(),
});

export type ReceiptItem = z.infer<typeof ReceiptItem>;

export const ReceiptClassification = z.object({
  category: z.string(),
  purpose: z.string(),
  expenseType: z.string(),
  vendorType: z.string(),
  complianceCategory: z.string(),
  ethicalRiskScore: z.number(),
  responsiblePartyType: z.string(),
});

export type ReceiptClassification = z.infer<typeof ReceiptClassification>;

export const ReceiptRecord = z.object({
  id: z.string(),
  date: z.coerce.date(),
  storeName: z.string(),
  storeAddress: z.string(),
  cashierName: z.string().optional(),
  items: ReceiptItem.array(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currencyCode: z.string(),
  paymentMethod: z.string(),
  paymentDetails: z.record(z.string()),
  classification: ReceiptClassification,
  metadata: z.unknown(),
});

export type ReceiptRecord = z.infer<typeof ReceiptRecord>;

export const ReceiptEntry = z.object({
  _id: z.instanceof(ObjectId),
  documentHash: z.string(),
  languageCodes: z.string().array(),
  receipt: ReceiptRecord,
});

export type ReceiptEntry = z.infer<typeof ReceiptEntry>;
