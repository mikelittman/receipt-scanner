import { Db } from "mongodb";
import { Schema } from "../schema";
import { getCollection } from "../client";

export async function storeDocumentName(
  db: Db,
  doc: Schema.DocumentName.Entry
) {
  const collection = getCollection(db, "documentNames");

  const result = await collection.updateOne(
    { documentHash: doc.documentHash },
    {
      $set: doc,
    },
    { upsert: true }
  );

  return result;
}

export async function getDocumentName(db: Db, hash: string) {
  const collection = getCollection(db, "documentNames");

  const documents = await collection.find({ documentHash: hash }).toArray();

  return documents;
}
