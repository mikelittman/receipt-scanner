import "dotenv/config";

import { getCollection, receiptScannerTransaction } from "./lib/db/client";
import { createEmbeddings, getOpenAIClient } from "./lib/ai/openai";

async function dropDb() {
  await receiptScannerTransaction(async (db) => {
    const collections = await db.listCollections().toArray();
    for (const { name } of collections) {
      await db.collection(name).drop();
    }
  });
}

async function main() {
  // return dropDb();

  const openai = getOpenAIClient();
  // createJsonCompletionWithFunctions(openai, z.object({
  // }));

  const results = await receiptScannerTransaction(async (db) => {
    // vector search for receipt embeddings
    const query = "transportation";

    const { embeddings } = await createEmbeddings(openai, query);
    const [{ embedding }] = embeddings;

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
        $group: {
          _id: "$documentHash",
          documentHash: { $first: "$documentHash" },
          receipt: { $first: "$receipt" },
          score: { $first: "$score" },
        },
      },
      {
        $project: {
          _id: 0,
          documentHash: 1,
          receipt: 1,
          score: 1,
        },
      },
    ]);

    return result.toArray();
  });

  console.dir(results, { depth: 4 });
  console.log(results.length, "results");
}

if (require.main === module) {
  main();
}
