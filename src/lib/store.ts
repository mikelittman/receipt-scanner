import { Db } from "mongodb";
import { Schema } from "./db/schema";
import { getCollection } from "./db/client";

export async function storeReceipt(db: Db, receipt: Schema.Receipt.Entry) {
  const collection = getCollection(db, "receipts");

  await collection.createIndex(
    {
      documentHash: 1,
    },
    {
      unique: true,
    }
  );

  const result = await collection.updateOne(
    { documentHash: receipt.documentHash },
    {
      $set: receipt,
    },
    { upsert: true }
  );

  await collection.createSearchIndex({
    name: "receipts",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          documentHash: {
            type: "string",
          },
          languageCodes: {
            type: "string",
          },
        },
      },
    },
  });

  return result;
}

export async function storeReceiptEmbedding(
  db: Db,
  embedding: Schema.Receipt.Embedding
) {
  const collection = getCollection(db, "receiptEmbedding");

  await collection.createIndex(
    {
      documentHash: 1,
      languageCode: 1,
    },
    {
      unique: true,
    }
  );

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

  await collection.createSearchIndex({
    name: "receiptEmbedding",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          documentHash: {
            type: "string",
          },
          languageCode: {
            type: "string",
          },
          text: {
            type: "string",
          },
          embeddings: {
            type: "knnVector",
            dimensions: 1024,
            similarity: "cosine",
          },
        },
      },
    },
  });

  return result;
}
