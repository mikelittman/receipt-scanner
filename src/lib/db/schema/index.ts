import { z } from "zod";
import {
  ReceiptEntry,
  ReceiptEmbedding,
  ReceiptRecord,
  ReceiptItem,
  ReceiptClassification,
} from "./receipts";
import type { OptionalId } from "mongodb";
import { ScannedDocument } from "./scanned-document";
import { DocumentName as DocumentNames } from "./document-name";

export const Collections = {
  receipts: ReceiptEntry,
  receiptEmbedding: ReceiptEmbedding,
  scannedDocuments: ScannedDocument,
  documentNames: DocumentNames,
};

export namespace Schema {
  export namespace Receipt {
    // db schema
    export type Entry = OptionalId<ReceiptEntry>;
    export const Entry = ReceiptEntry;
    export type Embedding = OptionalId<ReceiptEmbedding>;
    export const Embedding = ReceiptEmbedding;
    // supplemental schema
    export type Record = ReceiptRecord;
    export const Record = ReceiptRecord;
    export type Item = ReceiptItem;
    export const Item = ReceiptItem;
    export const Classification = ReceiptClassification;
    export type Classification = ReceiptClassification;
  }

  export namespace ScannedDocument {
    export type Entry = OptionalId<ScannedDocument>;
    export const Entry = ScannedDocument;
  }

  export namespace DocumentName {
    export type Entry = OptionalId<DocumentNames>;
    export const Entry = DocumentNames;
  }
}

export type Collection = {
  [key in keyof typeof Collections]: OptionalId<
    z.infer<(typeof Collections)[key]>
  >;
};

export type CollectionType = keyof Collection;
