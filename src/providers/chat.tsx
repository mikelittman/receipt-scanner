"use client";

import { EventEmitter } from "events";
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from "react";

// Define the shape of the chat message
export interface ChatMessage {
  id: number;
  sender: string;
  content: string | React.ReactNode;
  contentType?: "text/plain" | "text/markdown" | "text/html";
  timestamp: Date;
}

// Define the shape of the chat context
interface ChatContextType {
  messages: ChatMessage[];
  events: ChatMessageEmitter;
  sendMessage: (
    sender: string,
    content: string | React.ReactNode,
    contentType?: ChatMessage["contentType"]
  ) => ChatMessage;
}

// Create the chat context
export const ChatContext = createContext<ChatContextType>({
  messages: [],
  events: new EventEmitter(),
  sendMessage: () => null as any,
});

let _id = 69;

// Create the chat provider component
export const ChatProvider: FC<PropsWithChildren> = ({ children }) => {
  const events: ChatMessageEmitter = new EventEmitter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Function to send a new chat message
  const sendMessage: ChatContextType["sendMessage"] = (
    sender,
    content,
    contentType
  ) => {
    const newMessage: ChatMessage = {
      id: Date.now() + _id++,
      sender,
      content,
      contentType,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    events.emit("message", newMessage);

    return newMessage;
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, events }}>
      {children}
    </ChatContext.Provider>
  );
};

interface ChatMessageEmitter extends Omit<EventEmitter, "on" | "emit"> {
  on(event: "message", listener: (message: ChatMessage) => void): this;
  off(event: "message", listener: (message: ChatMessage) => void): this;
  emit(event: "message", message: ChatMessage): boolean;
}

export const useChat = () => {
  return useContext(ChatContext);
};
