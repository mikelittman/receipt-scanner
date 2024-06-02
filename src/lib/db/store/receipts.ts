import { Db } from "mongodb";
import { Schema } from "../schema";
import { getCollection } from "../client";
import { z } from "zod";

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

const QueryReceiptEmbeddingsShape = z.object({
  documentHash: z.string(),
  receipt: Schema.Receipt.Entry.array(),
  score: z.number(),
  documentNames: Schema.DocumentName.Entry.array(),
});

export async function queryReceiptEmbeddings(db: Db, embedding: number[]) {
  const collection = getCollection(db, "receiptEmbedding");

  const result = await collection.aggregate([
    {
      $vectorSearch: {
        index: "receiptEmbedding_vectorSearch",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 1000,
        limit: 100,
      },
    },
    {
      $project: {
        documentHash: 1,
        languageCode: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $lookup: {
        from: "receipts",
        localField: "documentHash",
        foreignField: "documentHash",
        as: "receipt",
      },
    },
    {
      $lookup: {
        from: "documentNames",
        localField: "documentHash",
        foreignField: "documentHash",
        as: "documentNames",
      },
    },
    {
      $group: {
        _id: "$documentHash",
        documentHash: { $first: "$documentHash" },
        receipt: { $first: "$receipt" },
        score: { $first: "$score" },
        documentNames: { $first: "$documentNames" },
      },
    },
    {
      $project: {
        _id: 0,
        documentHash: 1,
        documentNames: 1,
        receipt: 1,
        score: 1,
      },
    },
  ]);

  const searchResult = await result.toArray();

  console.log("searchResults", searchResult.length);

  try {
    return QueryReceiptEmbeddingsShape.array().parse(searchResult);
  } catch (err) {
    if (err instanceof Error) {
      console.error("🚨🚨🚨🚨🚨", err.message);
    } else {
      console.error("Unknown error");
    }
  }
}
