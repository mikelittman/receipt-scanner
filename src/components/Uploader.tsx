"use client";

import { useUpload } from "@/providers/uploader";
import React, { useRef } from "react";

export function Uploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();

  const handleDivClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-1/3 bg-white p-4 rounded-lg shadow-md flex flex-col">
      <h2 className="text-xl font-semibold mb-4">File Upload Area</h2>
      <div
        className="hover:bg-[#f9fafb]"
        id="file-upload-area"
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
  );
}
