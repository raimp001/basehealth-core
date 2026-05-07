"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WebRTCService } from "@/lib/webrtc"
import { Video, Mic, MicOff, VideoOff, MessageSquare, X } from "lucide-react"

interface VirtualVisitProps {
  provider: {
    id: string
    name: string
    specialty: string
  }
  appointmentId: string
  onEndCall: () => void
}

export function VirtualVisit({ provider, appointmentId, onEndCall }: VirtualVisitProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; timestamp: Date }>>([])
  const [newMessage, setNewMessage] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcRef = useRef<WebRTCService | null>(null)

  useEffect(() => {
    // Initialize WebRTC for this appointment room
    webrtcRef.current = new WebRTCService(appointmentId)
    webrtcRef.current.onRemoteStream((stream: MediaStream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    })

    // Start local stream
    webrtcRef.current.startLocalStream().then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    })

    return () => {
      webrtcRef.current?.disconnect()
    }
  }, [appointmentId])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          sender: "You",
          text: newMessage,
          timestamp: new Date(),
        },
      ])
      setNewMessage("")
    }
  }

  const toggleVideo = () => {
    if (webrtcRef.current) {
      const newState = !isVideoEnabled
      webrtcRef.current.toggleVideo(newState)
      setIsVideoEnabled(newState)
    }
  }

  const toggleAudio = () => {
    if (webrtcRef.current) {
      const newState = !isAudioEnabled
      webrtcRef.current.toggleAudio(newState)
      setIsAudioEnabled(newState)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleVideo}
            className="bg-black/50 hover:bg-black/70"
          >
            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleAudio}
            className="bg-black/50 hover:bg-black/70"
          >
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-black/50 hover:bg-black/70"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={onEndCall}
            className="bg-red-600 hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isChatOpen && (
        <Card className="absolute right-4 top-20 w-80 h-[calc(100vh-8rem)] flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Chat with {provider.name}</h3>
          </div>
          <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{message.sender}</span>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 