import { Db } from "mongodb";
import { Schema } from "../schema";
import { getCollection } from "../client";

export async function storeScannedDocument(
  db: Db,
  doc: Schema.ScannedDocument.Entry
) {
  const collection = getCollection(db, "scannedDocuments");

  const result = await collection.updateOne(
    { documentHash: doc.documentHash },
    {
      $set: doc,
    },
    { upsert: true }
  );

  return result;
}

export async function getScannedDocuments(db: Db, hash: string) {
  const collection = getCollection(db, "scannedDocuments");

  const documents = await collection.find({ documentHash: hash }).toArray();

  return documents;
}
