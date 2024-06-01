"use client";

import { ProcessDocumentState } from "@/lib/engine/process";
import { ChatMessage, useChat } from "@/providers/chat";
import { type UploadItem, useUpload } from "@/providers/uploader";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Content } from "./Content";
import { Spinner } from "./icons/Spinner";

export function Chat() {
  const { messages, sendMessage, events } = useChat();
  const { events: uploadEvents } = useUpload();

  const messageListener = (message: ChatMessage) => {
    console.log("New message received", message);
  };

  const processListener = useCallback(
    (item: UploadItem, state: ProcessDocumentState) => {
      console.log("Processing state changed", item, state);
      if (state.type === "data") {
        const duration = Date.now() - (item.startedAt?.getTime() ?? Date.now());
        sendMessage(
          "system",
          `Receipt for ${state.data.entry.receipt.storeName} imported in ${(
            duration / 1000.0
          ).toFixed(2)}s`
        );
      }
    },
    [sendMessage]
  );

  useEffect(() => {
    events.on("message", messageListener);
    return () => void events.off("message", messageListener);
  }, [events]);

  useEffect(() => {
    uploadEvents.on("process", processListener);
    return () => void uploadEvents.off("process", processListener);
  }, [uploadEvents, processListener]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      setInput("");
      sendMessage("user", input);
      const message = sendMessage("assistant", <Spinner />);
      setLoading(true);
      fetch("/api/query", {
        body: JSON.stringify({ query: input }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          console.log({ data });
          return data;
        })
        .then(({ response, contentType }) => {
          console.log("Response", response, contentType);
          message.id = Date.now();
          message.content = response;
          message.contentType = contentType;
          // return sendMessage("assistant", response, contentType);
        })
        .catch((err) => {
          console.error("OOOOPS");
        })
        .finally(() => {
          setLoading(false);

          if (!messagesRef.current) return;
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        });
    },
    [input, sendMessage, setLoading]
  );

  const sortedMessages = useMemo(
    () => messages.sort((a, b) => b.id - a.id),
    [messages]
  );

  return (
    <div className="w-1/2 bg-white p-4 rounded-lg shadow-md flex flex-col">
      <div
        className="flex flex-col flex-1"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <form className="w-full" onSubmit={onSubmit}>
          <div
            className="chat-bar flex items-center"
            style={{
              borderBottom: "1px solid #e5e7eb",
              padding: "0.5rem",
            }}
          >
            <input
              type="text"
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded"
              placeholder="Type a message..."
            />
            <button
              id="send-button"
              disabled={loading}
              className="ml-2 p-2 bg-blue-500 text-white rounded"
            >
              Send
            </button>
          </div>
        </form>
        <div
          className="flex-1"
          id="chat-messages"
          ref={messagesRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
          }}
        >
          {sortedMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 mb-4 border border-gray-300 rounded ${
                message.sender === "assistant"
                  ? "bg-gray-100"
                  : message.sender === "system"
                  ? "bg-yellow-100"
                  : ""
              }`}
            >
              <Content {...{ ...message }} />

              <div className="text-xs text-gray-500 uppercase">
                {message.sender}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
