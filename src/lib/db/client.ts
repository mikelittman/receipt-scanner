import { Db, MongoClient } from "mongodb";
import { Collection, CollectionType } from "./schema";

function getConfig() {
  const { MONGODB_CONNECTION } = process.env;

  if (!MONGODB_CONNECTION) {
    throw new Error("MONGODB_CONNECTION is not defined");
  }

  return {
    MONGODB_CONNECTION,
  };
}

export async function getDbClient(): Promise<MongoClient> {
  const { MONGODB_CONNECTION } = getConfig();

  const client = new MongoClient(MONGODB_CONNECTION);

  await client.connect();

  return client;
}

export function getDb(client: MongoClient, dbName: string): Db {
  return client.db(dbName);
}

export function getReceiptScannerDb(client: MongoClient) {
  return getDb(client, "receipt-scanner");
}

export function getCollection<T extends CollectionType>(
  db: Db,
  collectionName: T
) {
  return db.collection<Collection[T]>(collectionName);
}

export async function receiptScannerTransaction<T>(
  fn: (db: Db) => Promise<T>
): Promise<T> {
  const client = await getDbClient();
  const db = getReceiptScannerDb(client);

  let result: T | undefined;
  try {
    result = await fn(db);
  } finally {
    await client.close();
  }
  return result;
}
