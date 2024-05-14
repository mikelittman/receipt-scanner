import { z } from "zod";
import {
  ReceiptEntry,
  ReceiptEmbedding,
  ReceiptRecord,
  ReceiptItem,
} from "./receipts";
import type { OptionalId } from "mongodb";

export const Collections = {
  receipts: ReceiptEntry,
  receiptEmbedding: ReceiptEmbedding,
};

export namespace Schema {
  export namespace Receipt {
    export type Entry = OptionalId<ReceiptEntry>;
    export const Entry = ReceiptEntry;
    export type Embedding = OptionalId<ReceiptEmbedding>;
    export const Embedding = ReceiptEmbedding;
    export type Record = z.infer<typeof ReceiptRecord>;
    export const Record = ReceiptRecord;
    export type Item = z.infer<typeof ReceiptItem>;
    export const Item = ReceiptItem;
  }
}

export type Collection = {
  [key in keyof typeof Collections]: OptionalId<
    z.infer<(typeof Collections)[key]>
  >;
};

export type CollectionType = keyof Collection;
