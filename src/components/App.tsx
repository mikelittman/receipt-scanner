import { UploadProvider } from "@/providers/uploader";
import { Chat } from "./Chat";
import { Uploader } from "./Uploader";
import { ChatProvider } from "@/providers/chat";

export function App() {
  return (
    <UploadProvider>
      <ChatProvider>
        <div className="container mx-auto p-4 h-screen flex space-x-4">
          <Uploader />
          <Chat />
        </div>
      </ChatProvider>
    </UploadProvider>
  );
}
