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
    name: "receipts_search",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          documentHash: [
            {
              type: "string",
            },
          ],
          languageCodes: [
            {
              type: "string",
            },
          ],
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

  await collection.createSearchIndexes([
    {
      name: "receiptEmbedding_search",
      type: "search",
      definition: {
        mappings: {
          dynamic: true,
          fields: {
            documentHash: [
              {
                type: "string",
              },
            ],
            languageCode: [
              {
                type: "string",
              },
            ],
            text: [
              {
                type: "string",
              },
            ],
          },
        },
      },
    },
    {
      name: "receiptEmbedding_vectorSearch",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embeddings.embedding",
            numDimensions: 512,
            similarity: "cosine",
          },
        ],
      },
    },
  ]);

  return result;
}
