"use client";

import { ChatMessage, useChat } from "@/providers/chat";
import { useEffect, useState } from "react";

export function Chat() {
  const { messages, sendMessage, events } = useChat();

  const listener = (message: ChatMessage) => {
    console.log("New message received", message);
  };

  useEffect(() => {
    events.on("message", listener);

    return () => {
      events.off("message", listener);
    };
  }, [events]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-1/3 bg-white p-4 rounded-lg shadow-md flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Chat Window</h2>
      <div
        className="flex flex-col flex-1"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          className="flex-1"
          id="chat-messages"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-2 mb-4 border border-gray-300 rounded ${
                message.sender === "assistant" ? "bg-gray-100" : ""
              }`}
            >
              {message.content}

              <div className="text-xs text-gray-500">
                {message.sender === "assistant" ? "Assistant" : "User"}
              </div>
            </div>
          ))}
        </div>
        <div
          className="chat-bar flex items-center"
          style={{
            borderTop: "1px solid #e5e7eb",
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
            onClick={() => {
              setInput("");
              sendMessage("user", input);
              setLoading(true);

              setTimeout(() => {
                sendMessage("assistant", `You said: ${input}`);
                setLoading(false);
              }, 2500);
            }}
            className="ml-2 p-2 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
