import React, { useState, useEffect } from 'react';
import { FaHeadset, FaRandom, FaPaperPlane } from 'react-icons/fa';
import { Room, RemoteParticipant } from 'livekit-client';
import '@livekit/components-styles';
import '../styles/globals.css';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [room] = useState(() => new Room());
  const [messages, setMessages] = useState<string[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError('');
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
      setMessages([]);
    };

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      const message = new TextDecoder().decode(payload);
      setMessages(prev => [...prev, `${participant?.identity || 'System'}: ${message}`]);
    };

    room
      .on('connected', handleConnected)
      .on('disconnected', handleDisconnected)
      .on('dataReceived', handleDataReceived);

    return () => {
      room.disconnect();
    };
  }, [room]);

  const handleConnect = async () => {
    try {
      setConnectionError('Connecting...');
      
      if (!token) {
        setConnectionError('Please enter a valid token');
        return;
      }

      await room.connect(
        'wss://progrify-agent-3mrmq7y4.livekit.cloud',
        token,
        {
          autoSubscribe: true,
        }
      );
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="ai-agent-container floating">
      <div className="ai-agent-header">
        <div className="ai-agent-info">
          <div className="ai-avatar">
            <FaHeadset />
          </div>
          <div>
            <div className="ai-name">AI Sales Agent</div>
            <div className="ai-role">
              {isConnected ? 'Connected ✅' : 'Disconnected ❌'}
            </div>
          </div>
        </div>
        <button
          className="connect-btn"
          onClick={handleConnect}
          disabled={isConnected}
        >
          <FaRandom /> {isConnected ? 'Connected' : 'Connect'}
        </button>
      </div>

      <div className="ai-message">
        {!isConnected && (
          <div className="token-input">
            <input
              type="text"
              placeholder="Paste token from agent console"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        )}
        {connectionError && (
          <div className="connection-error">{connectionError}</div>
        )}
        <div className="message-history">
          {messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      </div>

      <div className="user-input">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={!isConnected}
        />
        <button 
          className="send-btn" 
          onClick={handleSend}
          disabled={!isConnected}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}