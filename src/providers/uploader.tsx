"use client";

import { Schema } from "@/lib/db/schema";
import type { ProcessDocumentState } from "@/lib/doc/process";
import EventEmitter from "events";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type UploadItemBase = {
  file: File;
  startedAt?: Date;
};

export type UploadItem = UploadItemBase &
  (
    | { status: "uploading" }
    | { status: "processing"; message?: string }
    | { status: "done"; entry: Schema.Receipt.Entry }
    | { status: "failed"; error: Error }
    | { status: "waiting" }
  );
// Define the shape of the context value
interface UploadContextValue {
  uploadFile: (file: File) => void;
  itemList: UploadItem[];
  events: UploadProviderEventEmitter;
}

// Create the context
export const UploadContext = createContext<UploadContextValue>({
  uploadFile: () => {},
  itemList: [],
  events: new EventEmitter(),
});

// Create a provider component
export const UploadProvider: React.FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const events: UploadProviderEventEmitter = useMemo(
    () => new EventEmitter(),
    []
  );
  const [itemList, setItemList] = useState<UploadItem[]>([]);

  const findByFile = (items: UploadItem[], file: File) => {
    return items.findIndex((f) => f.file.name === file.name);
  };

  const upsertItem = useCallback(
    (item: UploadItem): UploadItem => {
      setItemList((prevItems) => {
        const index = findByFile(prevItems, item.file);
        if (index === -1) {
          return [...prevItems, item];
        }

        const newItems = [...prevItems];
        newItems.splice(index, 1, {
          ...prevItems[index],
          ...item,
        });
        return newItems;
      });
      const existing = findByFile(itemList, item.file);
      const previous = existing === -1 ? {} : itemList[existing];
      return { ...previous, ...item };
    },
    [setItemList, itemList]
  );

  const uploadFile = useCallback(
    (file: File) => {
      upsertItem({ status: "waiting", file });

      // todo: implement max concurrent uploads
      const startedAt = new Date();
      events.emit(
        "upload",
        upsertItem({ status: "uploading", file, startedAt })
      );

      const formData = new FormData();
      formData.append("file", file);

      fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (response.status < 200 || response.status >= 300) {
            throw new Error("Failed to upload file");
          }
          const reader = response.body?.getReader();
          // read() returns a promise that resolves when a value has been received
          return reader?.read().then(function pump({ done, value }): unknown {
            if (done) return;
            try {
              const response: ProcessDocumentState = JSON.parse(
                Buffer.from(value ?? []).toString("utf-8")
              );
              if (response.type !== "data") {
                events.emit(
                  "process",
                  upsertItem({
                    status: "processing",
                    message: response.message,
                    file,
                    startedAt,
                  }),
                  response
                );
              } else {
                events.emit(
                  "process",
                  upsertItem({
                    status: "done",
                    file,
                    entry: response.data.entry,
                    startedAt,
                  }),
                  response
                );
              }
            } catch (err) {
              console.error("failed to process file ", file.name, err);
            }
            return reader.read().then(pump);
          });
        })
        .catch((err) => {
          upsertItem({ status: "failed", file, error: err, startedAt });
          console.warn("failed to upload file", file.name, err);
        });
    },
    [upsertItem, events]
  );

  return (
    <UploadContext.Provider value={{ uploadFile, itemList, events }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  return useContext(UploadContext);
};

interface UploadProviderEventEmitter
  extends Omit<EventEmitter, "on" | "off" | "emit"> {
  on(event: "upload", listener: (item: UploadItem) => void): this;
  off(event: "upload", listener: (item: UploadItem) => void): this;
  emit(event: "upload", item: UploadItem): boolean;

  on(
    event: "process",
    listener: (item: UploadItem, state: ProcessDocumentState) => void
  ): this;
  off(
    event: "process",
    listener: (item: UploadItem, state: ProcessDocumentState) => void
  ): this;
  emit(
    event: "process",
    item: UploadItem,
    state: ProcessDocumentState
  ): boolean;
}
