"use client";

import { useUpload } from "@/providers/uploader";
import React, { useRef } from "react";
import { UploadStatusList } from "./UploadStatus";

export function Uploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();

  const handleDivClick: React.MouseEventHandler = (e) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white p-4 rounded-lg shadow-md flex flex-col h-1/2">
        <div
          className="hover:bg-[#f9fafb]"
          style={{
            border: "2px dashed #e5e7eb",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleDivClick}
          onDrop={(e) => {
            e.stopPropagation();
            e.preventDefault();
            Array.from(e.dataTransfer.files).forEach((file) =>
              uploadFile(file)
            );
          }}
          onDragOver={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <input
            type="file"
            className="hidden"
            multiple
            onInput={(e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) {
                for (let i = 0; i < files.length; i++) {
                  uploadFile(files[i]);
                }
              }
            }}
            ref={fileInputRef}
          />
          <p>Drag & Drop files here or click to upload</p>
        </div>
      </div>
      <div className="h-1/2 mt-4">
        <UploadStatusList />
      </div>
    </div>
  );
}
