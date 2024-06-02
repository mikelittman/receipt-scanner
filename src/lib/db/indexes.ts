import { Db } from "mongodb";
import { getCollection } from "./client";

export async function configureIndexes(db: Db) {
  const receiptsCollection = getCollection(db, "receipts");

  await receiptsCollection.createIndex(
    {
      documentHash: 1,
    },
    {
      name: "documentHash",
      unique: true,
    }
  );

  await receiptsCollection.createSearchIndex({
    name: "receipts_search",
    definition: {
      mappings: {
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

  const receiptEmbedding = getCollection(db, "receiptEmbedding");

  await receiptEmbedding.createIndex(
    {
      documentHash: 1,
      languageCode: 1,
    },
    {
      name: "receiptEmbedding_documentHash-languageCode",
      unique: true,
    }
  );

  await receiptEmbedding.createSearchIndexes([
    {
      name: "receiptEmbedding_vectorSearch",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 1536,
            similarity: "cosine",
          },
        ],
      },
    },
  ]);

  const scannedDocuments = getCollection(db, "scannedDocuments");

  await scannedDocuments.createIndex(
    {
      documentHash: 1,
    },
    {
      name: "documentHash",
      unique: true,
    }
  );

  const documentNames = getCollection(db, "documentNames");

  await documentNames.createIndex(
    {
      documentHash: 1,
    },
    {
      name: "documentHash",
      unique: true,
    }
  );
}
