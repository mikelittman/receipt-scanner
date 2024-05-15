"use client";

import { useUpload } from "@/providers/uploader";
import { GreenCheck } from "./icons/GreenCheck";
import { RedX } from "./icons/RedX";
import { Spinner } from "./icons/Spinner";

export function UploadStatusList() {
  const { itemList } = useUpload();

  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        List of Uploads and Processing State
      </h2>
      <ul className="space-y-2 flex-1">
        {itemList.map((item) => (
          <li
            key={item.file.name}
            className="p-2 border border-gray-300 rounded flex items-center"
          >
            <div>
              <div>
                File {item.file.name} - {item.status}
              </div>
              <div className="flex flex-row"></div>
              <div>{item.status === "processing" && item.message}</div>
            </div>
            <div>
              {["uploading", "waiting", "processing"].includes(item.status) && (
                <Spinner />
              )}
              {item.status === "done" && <GreenCheck />}
              {item.status === "failed" && <RedX />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
