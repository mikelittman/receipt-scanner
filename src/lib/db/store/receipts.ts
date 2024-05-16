import { Db } from "mongodb";
import { Schema } from "../schema";
import { getCollection } from "../client";

export async function storeReceipt(db: Db, receipt: Schema.Receipt.Entry) {
  const collection = getCollection(db, "receipts");

  const result = await collection.updateOne(
    { documentHash: receipt.documentHash },
    {
      $set: receipt,
    },
    { upsert: true }
  );

  return result;
}

export async function storeReceiptEmbedding(
  db: Db,
  embedding: Schema.Receipt.Embedding
) {
  const collection = getCollection(db, "receiptEmbedding");

  const result = await collection.updateOne(
    {
      documentHash: embedding.documentHash,
      languageCode: embedding.languageCode,
    },
    {
      $set: embedding,
    },
    { upsert: true }
  );

  return result;
}
