'use client'
import Topbar from '../../components/layout/Topbar'
import ChatWindow from '../../components/chat/ChatWindow'

export default function ChatPage() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <Topbar title="AI Assistant" />
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  )
}
