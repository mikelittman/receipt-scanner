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
  content: string;
  timestamp: Date;
}

// Define the shape of the chat context
interface ChatContextType {
  messages: ChatMessage[];
  events: ChatMessageEmitter;
  sendMessage: (sender: string, content: string) => void;
}

// Create the chat context
export const ChatContext = createContext<ChatContextType>({
  messages: [],
  events: new EventEmitter(),
  sendMessage: () => {},
});

// Create the chat provider component
export const ChatProvider: FC<PropsWithChildren> = ({ children }) => {
  const events: ChatMessageEmitter = new EventEmitter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Function to send a new chat message
  const sendMessage = (sender: string, content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now(),
      sender,
      content,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    events.emit("message", newMessage);
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
