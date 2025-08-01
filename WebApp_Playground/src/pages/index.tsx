import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useRoomContext,
} from "@livekit/components-react";
import Head from "next/head";
import { useCallback, useState, useEffect } from "react";
import { ToastProvider, useToast } from "@/components/toast/ToasterProvider";
import { ConfigProvider } from "@/hooks/useConfig";
import { RoomEvent, ConnectionState } from "livekit-client";

const agents = {
  home: {
    name: 'Home Agent',
    role: 'Your AI Concierge',
    icon: 'fa-home',
    greeting: `Welcome to Progrify! I'm your Home Agent. I can connect you with our specialized agents:
      <ul style="margin-top: 10px; padding-left: 20px;">
        <li><strong>Prompt Engineer</strong> - Master AI communication</li>
        <li><strong>Coding Assistant</strong> - Build better, faster</li>
        <li><strong>Product Builder</strong> - Create digital products</li>
        <li><strong>Sales Coach</strong> - Practice client interactions</li>
      </ul>
      <p style="margin-top: 10px;">What would you like to work on today?</p>`,
  },
  prompt: {
    name: 'Prompt Engineer',
    role: 'AI Communication Specialist',
    icon: 'fa-terminal',
    greeting: `Hello! I'm your Prompt Engineering Agent. I can help you...`,
  },
  coding: {
    name: 'Coding Assistant',
    role: 'AI Pair Programmer',
    icon: 'fa-code',
    greeting: `Hi there! I'm your AI Coding Assistant.`,
  },
  product: {
    name: 'Product Builder',
    role: 'Digital Product Specialist',
    icon: 'fa-cube',
    greeting: `Welcome to the Digital Product Builder!`,
  },
  sales: {
    name: 'Sales Coach',
    role: 'AI Client Simulator',
    icon: 'fa-handshake',
    greeting: `Hello! I'm your AI Sales Coach.`,
  }
};

export default function Home() {
  const [shouldConnect, setShouldConnect] = useState(false);
  const { setToastMessage } = useToast();

  const handleConnect = (connect: boolean) => {
    setShouldConnect(connect);
  };

  const wsUrl = "ws://localhost:7880";
  const token = "devtoken";

  return (
    <ToastProvider>
      <ConfigProvider>
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={shouldConnect}
          onError={(e) => {
            setToastMessage({ message: e.message, type: "error" });
            console.error(e);
          }}
        >
          <HomePage onConnect={handleConnect} />
        </LiveKitRoom>
      </ConfigProvider>
    </ToastProvider>
  );
}

function HomePage({ onConnect }: { onConnect: (connect: boolean) => void }) {
  const room = useRoomContext();
  const [currentAgent, setCurrentAgent] = useState('home');
  const [agentMessage, setAgentMessage] = useState(agents.home.greeting);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = () => {
    if (inputValue.trim() && room.localParticipant && room.state === ConnectionState.Connected) {
      setIsTyping(true);
      room.localParticipant.publishData(new TextEncoder().encode(inputValue), "lk-user-text");
      setInputValue("");
    }
  };

  const switchAgent = (agentKey: string) => {
    if (agentKey === currentAgent) return;

    const agent = agents[agentKey as keyof typeof agents];
    setCurrentAgent(agentKey);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setAgentMessage(agent.greeting);
    }, 1500);

    if (room.localParticipant && room.state === ConnectionState.Connected) {
      room.localParticipant.publishData(new TextEncoder().encode(`switch to ${agentKey}`), "lk-user-text");
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    const handleData = (payload: Uint8Array, participant: any, topic: string) => {
      if (topic === 'lk-agent-chat') {
        const text = new TextDecoder().decode(payload);
        const chat = JSON.parse(text);
        setIsTyping(false);
        setAgentMessage(chat.text);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const isConnected = room.state === ConnectionState.Connected;

  return (
    <>
      <Head>
        <title>Progrify | AI-Powered Digital Mastery</title>
        <meta name="description" content="Master the universe of AI with Progrify's specialized agents for coding, product building, prompt engineering, and sales mastery." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>
      <main>
        <header>
          <div className="logo">
            <i className="fas fa-robot logo-icon"></i>
            <span>Progrify</span>
          </div>
          <nav>
            <ul>
              <li><a href="#specializations">Specializations</a></li>
              <li><a href="#studio">Sales Mastery</a></li>
              <li><a href="#testimonials">Success Stories</a></li>
            </ul>
          </nav>
          <div className="header-btns">
            <button className="btn-outline">Log In</button>
            <button className="btn" id="talkToAI" onClick={() => onConnect(!isConnected)}>
              <i className="fas fa-microphone"></i> {isConnected ? "Disconnect" : "Talk to AI"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-text">
            <h1>Master the Digital Universe with AI Superpowers</h1>
            <p>Progrify gives you four specialized AI agents that transform how you code, build products, craft prompts, and master sales - all through natural conversation.</p>
            <div className="hero-btns">
              <button className="btn btn-secondary"><i className="fas fa-play"></i> Watch Demo</button>
              <button className="btn"><i className="fas fa-bolt"></i> Start Free Trial</button>
            </div>
            <div className="free-label">
              <i className="fas fa-check-circle"></i> No credit card required
            </div>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-number">4X</span>
                <span className="stat-label">Productivity</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Focus</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Availability</span>
              </div>
            </div>
          </div>
          <div className="hero-animation">
            <div className="ai-agent-container floating" id="homeAgent">
              <div className="ai-agent-header">
                <div className="ai-agent-info">
                  <div className="ai-avatar">
                    <i className={`fas ${agents[currentAgent as keyof typeof agents].icon}`}></i>
                  </div>
                  <div>
                    <div className="ai-name">{agents[currentAgent as keyof typeof agents].name}</div>
                    <div className="ai-role">{agents[currentAgent as keyof typeof agents].role}</div>
                  </div>
                </div>
                <button className="btn" style={{ padding: '8px 15px', fontSize: '0.9rem' }} id="switchAgentBtn" onClick={() => setIsModalOpen(true)}>
                  <i className="fas fa-random"></i> Switch Agent
                </button>
              </div>
              <div className="ai-message" id="agentMessage" dangerouslySetInnerHTML={{ __html: agentMessage }}>
              </div>
              {isTyping && (
                <div className="typing-indicator active" id="typingIndicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <div className="user-input">
                <input type="text" id="userInput" placeholder="Type or speak your request..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} />
                <div className="input-actions">
                  <button className="voice-btn" id="voiceBtn"><i className="fas fa-microphone"></i></button>
                  <button className="send-btn" id="sendBtn" onClick={handleSendMessage}><i className="fas fa-paper-plane"></i></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isModalOpen && (
          <div className="modal" id="agentModal" style={{ display: 'flex' }}>
            <div className="modal-content">
              <span className="close-modal" id="closeModal" onClick={() => setIsModalOpen(false)}>&times;</span>
              <h3>Switch AI Specialist</h3>
              <p>Select the specialized agent you'd like to work with:</p>
              <div className="agent-options" style={{ marginTop: '20px' }}>
                {Object.keys(agents).map(key => (
                  <button key={key} className="btn-outline agent-option" style={{ width: '100%', marginBottom: '10px', textAlign: 'left' }} data-agent={key} onClick={() => switchAgent(key)}>
                    <i className={`fas ${agents[key as keyof typeof agents].icon}`}></i> {agents[key as keyof typeof agents].name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <RoomAudioRenderer />
        {isConnected && <StartAudio label="Click to enable audio playback" />}
      </main>
    </>
  );
}
