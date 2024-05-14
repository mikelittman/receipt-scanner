import "dotenv/config";

import { join } from "path";
import { processDocument } from "./lib/doc/process";
import { getDbClient, getReceiptScannerDb } from "./lib/db/client";
import { storeReceipt, storeReceiptEmbedding } from "./lib/store";
import { logger } from "./lib/logger";

async function main() {
  const project_root = join(__dirname, "..");

  const testpath = join(
    project_root,
    "challenge/my-receipts-master/2017/de/public transport/3ZCCCW.pdf"
  );

  const response = await processDocument(testpath);

  console.dir(response, { depth: 3 });

  const db_client = await getDbClient();

  const db = getReceiptScannerDb(db_client);

  const store = await storeReceipt(db, response.receipt);

  logger.info({ store }, "Receipt stored");

  const store_embedding = await storeReceiptEmbedding(db, response.embeddings);

  logger.info({ store_embedding }, "Receipt embedding stored");

  await db_client.close();
}

if (require.main === module) {
  main();
}
