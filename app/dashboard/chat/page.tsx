import { lusitana } from "@/app/ui/fonts";
import ChatPanel from "@/app/ui/chat/chat-panel";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <h1 className={`${lusitana.className} mb-4 text-2xl`}>知识库问答</h1>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <ChatPanel />
      </div>
    </div>
  );
}
