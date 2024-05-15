"use client";

import type { ProcessDocumentState } from "@/lib/doc/process";
import { PropsWithChildren, createContext, useContext, useState } from "react";

type UploadItemBase = {
  file: File;
};

type UploadItem = UploadItemBase &
  (
    | { status: "uploading" }
    | { status: "processing"; message?: string }
    | { status: "done" }
    | { status: "failed"; error: Error }
    | { status: "waiting" }
  );
// Define the shape of the context value
interface UploadContextValue {
  uploadFile: (file: File) => void;
  itemList: UploadItem[];
}

// Create the context
export const UploadContext = createContext<UploadContextValue>({
  uploadFile: () => {},
  itemList: [],
});

// Create a provider component
export const UploadProvider: React.FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const [itemList, setItemList] = useState<UploadItem[]>([]);

  const findByFile = (items: UploadItem[], file: File) => {
    return items.findIndex((f) => f.file.name === file.name);
  };

  const upsertItem = (item: UploadItem) => {
    setItemList((prevItems) => {
      const index = findByFile(prevItems, item.file);
      if (index === -1) {
        return [...prevItems, item];
      }

      const newItems = [...prevItems];
      newItems.splice(index, 1, item);
      return newItems;
    });
  };

  const uploadFile = (file: File) => {
    // Implement your upload logic here
    // Add the file status to the status list

    // upsertItem({ status: "waiting", file });

    // todo: implement max concurrent uploads
    upsertItem({ status: "uploading", file });

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    }).then((response) => {
      const reader = response.body?.getReader();
      // read() returns a promise that resolves when a value has been received
      reader?.read().then(function pump({ done, value }): unknown {
        try {
          const response: ProcessDocumentState = JSON.parse(
            Buffer.from(value ?? []).toString("utf-8")
          );
          if (response.type !== "data") {
            upsertItem({
              status: "processing",
              message: response.message,
              file,
            });
          }
        } catch {}
        if (done) {
          upsertItem({ status: "done", file });
          return;
        }
        return reader.read().then(pump);
      });
    });
  };

  return (
    <UploadContext.Provider value={{ uploadFile, itemList }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  return useContext(UploadContext);
};
