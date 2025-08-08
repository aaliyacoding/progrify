import Head from "next/head";
import { useEffect } from 'react';
import getConfig from 'next/config';
import { Room, RoomEvent, LocalAudioTrack, RemoteParticipant, RemoteTrackPublication, RemoteTrack } from 'livekit-client';

const { publicRuntimeConfig } = getConfig();

export default function Home() {
  useEffect(() => {
    // Ensure LiveKitClient is loaded
    if (typeof window.LiveKitClient === 'undefined') {
      console.error('LiveKitClient not loaded');
      return;
    }

    let currentRoom = null;
    let currentAgent = 'home';
    let audioStream = null;

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
        greeting: `Hi there! I'm your AI Coding Assistant. What are you working on today?`,
      },
      product: {
        name: 'Product Builder',
        role: 'Digital Product Specialist',
        icon: 'fa-cube',
        greeting: `Welcome to the Digital Product Builder! What are we building today?`,
      },
      sales: {
        name: 'Sales Coach',
        role: 'AI Client Simulator',
        icon: 'fa-handshake',
        greeting: `Hello! I'm your AI Sales Coach. Ready to practice your sales skills?`,
      }
    };

    const agentContainer = document.getElementById('homeAgent');
    const agentMessage = document.getElementById('agentMessage');
    const typingIndicator = document.getElementById('typingIndicator');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const switchAgentBtn = document.getElementById('switchAgentBtn');
    const talkToAIBtn = document.getElementById('talkToAI');
    const agentModal = document.getElementById('agentModal');
    const closeModal = document.getElementById('closeModal');
    const agentOptions = document.querySelectorAll('.agent-option');
    const specializationCards = document.querySelectorAll('.specialization-card');
    const connectionStatus = document.getElementById('connectionStatus');

    function updateConnectionStatus(status, message = '') {
      connectionStatus.className = `connection-status ${status}`;
      const statusText = status.charAt(0).toUpperCase() + status.slice(1);
      connectionStatus.innerHTML = `<i class="fas fa-circle"></i><span>${statusText} ${message}</span>`;
    }

    async function connectToAgent() {
      try {
        updateConnectionStatus('connecting');
        agentMessage.innerHTML = '<p>Connecting to AI agent...</p>';

        const resp = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName: 'user-' + Math.random().toString(36).substring(7) })
        });
        const { accessToken, identity, roomName } = await resp.json();

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        const livekitUrl = publicRuntimeConfig.livekitUrl || 'ws://localhost:7880';

        await room.connect(livekitUrl, accessToken);

        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = new LocalAudioTrack(audioStream.getAudioTracks()[0]);
        await room.localParticipant.publishTrack(audioTrack);

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'audio') {
            const audioElement = track.attach();
            document.body.appendChild(audioElement);
            updateConnectionStatus('connected');
            agentMessage.innerHTML = `<p>Connected! You can now talk to the agent.</p>`;
          }
        });

        room.on(RoomEvent.DataReceived, (payload, participant) => {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'agent_update') {
              updateAgentUI(data.agent);
            } else if (data.type === 'agent_message') {
                typingIndicator.classList.remove('active');
                agentMessage.innerHTML = data.message;
            } else if (data.type === 'agent_speaking') {
                typingIndicator.classList.add('active');
            }
        });

        room.on(RoomEvent.Disconnected, () => {
          updateConnectionStatus('disconnected');
          agentMessage.innerHTML = '<p>Disconnected. Click "Talk to AI" to reconnect.</p>';
        });

        currentRoom = room;
        updateConnectionStatus('connected');
        agentMessage.innerHTML = `<p>Connected to room ${roomName}. You can start talking now.</p>`;

      } catch (error) {
        console.error('Error connecting to agent:', error);
        updateConnectionStatus('disconnected', ` - ${error.message}`);
        agentMessage.innerHTML = `
          <p style="color: #ef4444;">Connection failed</p>
          <p>${error.message}</p>
          <p>Please ensure the AI agent server is running.</p>
        `;
      }
    }

    async function disconnectFromAgent() {
      if (currentRoom) {
        await currentRoom.disconnect();
        currentRoom = null;
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
      }
      updateConnectionStatus('disconnected');
    }

    function updateAgentUI(agentKey) {
      const agent = agents[agentKey];
      if (!agent) return;
      currentAgent = agentKey;

      document.querySelector('.ai-name').textContent = agent.name;
      document.querySelector('.ai-role').textContent = agent.role;
      document.querySelector('.ai-avatar i').className = `fas ${agent.icon}`;

      typingIndicator.classList.add('active');
      agentMessage.innerHTML = '';

      setTimeout(() => {
        typingIndicator.classList.remove('active');
        agentMessage.innerHTML = agent.greeting;
      }, 1000);
    }

    function switchAgent(agentKey) {
      if (!currentRoom || agentKey === currentAgent) return;
      const data = JSON.stringify({ type: 'switch_agent', agent: agentKey });
      currentRoom.localParticipant.publishData(new TextEncoder().encode(data));
      updateAgentUI(agentKey); // Optimistically update UI
    }

    function handleUserInput() {
      const text = userInput.value.trim();
      if (!text || !currentRoom) return;

      const data = JSON.stringify({ type: 'user_message', text: text });
      currentRoom.localParticipant.publishData(new TextEncoder().encode(data));

      userInput.value = '';
    }

    talkToAIBtn.addEventListener('click', () => {
      if (!currentRoom) {
        connectToAgent();
      } else {
        disconnectFromAgent();
      }
    });

    sendBtn.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUserInput();
    });

    voiceBtn.addEventListener('click', () => {
      // Placeholder for voice input activation
      console.log('Voice input activated');
    });

    switchAgentBtn.addEventListener('click', () => {
      agentModal.style.display = 'flex';
    });

    closeModal.addEventListener('click', () => {
      agentModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === agentModal) {
        agentModal.style.display = 'none';
      }
    });

    agentOptions.forEach(option => {
      option.addEventListener('click', () => {
        const agentKey = option.dataset.agent;
        switchAgent(agentKey);
        agentModal.style.display = 'none';
      });
    });

    specializationCards.forEach(card => {
      card.addEventListener('click', () => {
        const agentKey = card.dataset.agent;
        if (!currentRoom) {
          connectToAgent().then(() => switchAgent(agentKey));
        } else {
          switchAgent(agentKey);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    updateAgentUI('home');

    // Cleanup on component unmount
    return () => {
      disconnectFromAgent();
    };

  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Progrify | AI-Powered Digital Mastery</title>
        <meta name="description" content="Master the universe of AI with Progrify's specialized agents for coding, product building, prompt engineering, and sales mastery." />
        <style>{`
            :root {
              --primary: #7c3aed;
              --primary-dark: #5b21b6;
              --primary-light: #c4b5fd;
              --secondary: #f59e0b;
              --accent: #ec4899;
              --dark: #0f172a;
              --darker: #020617;
              --light: #f8fafc;
              --gray: #94a3b8;
              --success: #10b981;
              --danger: #ef4444;

              --card-bg: rgba(255, 255, 255, 0.05);
              --glass-bg: rgba(255, 255, 255, 0.03);
              --shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
              --shadow-lg: 0 30px 60px rgba(0, 0, 0, 0.15);
              --gradient: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #ec4899 100%);
              --elegant-bg: radial-gradient(ellipse at center, #1a1b2f 0%, #0f172a 100%);
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Outfit', sans-serif;
              background: var(--elegant-bg);
              color: var(--light);
              line-height: 1.7;
              overflow-x: hidden;
              min-height: 100vh;
            }

            h1, h2, h3, h4, h5 {
              font-family: 'Playfair Display', serif;
              font-weight: 600;
              line-height: 1.2;
            }

            /* Glow effects */
            @keyframes pulse-glow {
              0% { box-shadow: 0 0 15px rgba(124, 58, 237, 0.3); }
              50% { box-shadow: 0 0 30px rgba(124, 58, 237, 0.5); }
              100% { box-shadow: 0 0 15px rgba(124, 58, 237, 0.3); }
            }

            /* Header */
            header {
              background: rgba(2, 6, 23, 0.8);
              padding: 20px 5%;
              display: flex;
              align-items: center;
              justify-content: space-between;
              position: fixed;
              width: 100%;
              top: 0;
              z-index: 1000;
              backdrop-filter: blur(10px);
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .logo {
              font-size: 1.8rem;
              font-weight: 700;
              background: var(--gradient);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              display: flex;
              align-items: center;
              gap: 10px;
              letter-spacing: 0.5px;
            }

            .logo-icon {
              color: var(--secondary);
            }

            nav ul {
              display: flex;
              list-style: none;
              gap: 30px;
            }

            nav a {
              text-decoration: none;
              color: var(--light);
              font-weight: 400;
              font-size: 1rem;
              transition: all 0.3s;
              position: relative;
              opacity: 0.9;
              letter-spacing: 0.5px;
            }

            nav a:hover {
              color: var(--primary-light);
              opacity: 1;
            }

            nav a::after {
              content: '';
              position: absolute;
              width: 0;
              height: 1px;
              background: var(--primary-light);
              bottom: -5px;
              left: 0;
              transition: width 0.3s;
            }

            nav a:hover::after {
              width: 100%;
            }

            .header-btns {
              display: flex;
              gap: 15px;
            }

            .btn {
              background: var(--gradient);
              color: white;
              border: none;
              padding: 12px 25px;
              border-radius: 50px;
              font-weight: 500;
              font-size: 0.95rem;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: var(--shadow);
              position: relative;
              overflow: hidden;
              z-index: 1;
              letter-spacing: 0.5px;
            }

            .btn:hover {
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
            }

            .btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
              transition: 0.5s;
              z-index: -1;
            }

            .btn:hover::before {
              left: 100%;
            }

            .btn-outline {
              background: transparent;
              border: 1px solid var(--primary);
              color: var(--primary);
            }

            .btn-outline:hover {
              background: var(--primary);
              color: white;
            }

            .btn-secondary {
              background: var(--secondary);
            }

            .btn-secondary:hover {
              background: #d97706;
            }

            /* Hero Section */
            .hero {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 180px 5% 100px;
              gap: 60px;
              max-width: 1400px;
              margin: 0 auto;
              position: relative;
            }

            .hero::before {
              content: '';
              position: absolute;
              top: -200px;
              right: -200px;
              width: 600px;
              height: 600px;
              background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(236, 72, 153, 0.05) 70%, transparent 100%);
              z-index: -1;
            }

            .hero-text {
              flex: 1;
              max-width: 600px;
            }

            .hero-text h1 {
              font-size: 3.5rem;
              line-height: 1.1;
              margin-bottom: 25px;
              background: linear-gradient(to right, #8b5cf6, #c4b5fd);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              position: relative;
              letter-spacing: -0.5px;
            }

            .hero-text h1::after {
              content: '';
              position: absolute;
              bottom: -10px;
              left: 0;
              width: 100px;
              height: 2px;
              background: var(--gradient);
            }

            .hero-text p {
              font-size: 1.2rem;
              line-height: 1.6;
              color: var(--gray);
              margin-bottom: 40px;
              opacity: 0.9;
              font-weight: 300;
            }

            .hero-btns {
              display: flex;
              gap: 20px;
              margin-bottom: 40px;
            }

            .free-label {
              font-size: 0.85rem;
              color: var(--gray);
              margin-top: 5px;
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .free-label i {
              color: var(--success);
            }

            .stats {
              display: flex;
              gap: 30px;
              margin-top: 40px;
            }

            .stat-item {
              display: flex;
              flex-direction: column;
            }

            .stat-number {
              font-size: 2rem;
              font-weight: 700;
              background: var(--gradient);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }

            .stat-label {
              font-size: 0.9rem;
              color: var(--gray);
              font-weight: 300;
            }

            .hero-animation {
              flex: 1;
              position: relative;
              max-width: 600px;
            }

            .ai-agent-container {
              background: var(--card-bg);
              border-radius: 12px;
              padding: 30px;
              box-shadow: var(--shadow);
              position: relative;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(10px);
            }

            .ai-agent-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: var(--gradient);
            }

            .ai-agent-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
            }

            .ai-agent-info {
              display: flex;
              align-items: center;
              gap: 15px;
            }

            .ai-avatar {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              background: var(--gradient);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 1.1rem;
            }

            .ai-name {
              font-weight: 600;
              font-size: 1rem;
              color: white;
            }

            .ai-role {
              font-size: 0.8rem;
              color: var(--gray);
              font-weight: 300;
            }

            .ai-message {
              background: rgba(30, 41, 59, 0.3);
              padding: 15px;
              border-radius: 8px 8px 8px 0;
              margin-bottom: 20px;
              animation: fadeIn 0.5s ease;
              color: var(--light);
              font-weight: 300;
            }

            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .ai-message p {
              font-size: 0.9rem;
              margin-bottom: 0;
            }

            .user-input {
              display: flex;
              gap: 10px;
              margin-top: 20px;
            }

            .user-input input {
              flex: 1;
              padding: 12px 15px;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.05);
              font-family: inherit;
              font-size: 0.9rem;
              outline: none;
              transition: all 0.3s;
              background: rgba(15, 23, 42, 0.5);
              color: white;
              font-weight: 300;
            }

            .user-input input::placeholder {
              color: rgba(255, 255, 255, 0.3);
            }

            .user-input input:focus {
              border-color: var(--primary);
              box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }

            .input-actions {
              display: flex;
              gap: 10px;
            }

            .voice-btn, .send-btn {
              background: var(--gradient);
              color: white;
              border: none;
              width: 42px;
              height: 42px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.3s;
            }

            .voice-btn:hover, .send-btn:hover {
              transform: scale(1.05);
            }

            .typing-indicator {
              display: flex;
              gap: 5px;
              padding: 10px 15px;
              background: rgba(30, 41, 59, 0.3);
              border-radius: 8px 8px 8px 0;
              width: fit-content;
              margin-bottom: 10px;
              opacity: 0;
              transition: opacity 0.3s;
            }

            .typing-indicator.active {
              opacity: 1;
            }

            .typing-dot {
              width: 6px;
              height: 6px;
              background: var(--gray);
              border-radius: 50%;
              animation: typingAnimation 1.4s infinite ease-in-out;
            }

            .typing-dot:nth-child(1) {
              animation-delay: 0s;
            }

            .typing-dot:nth-child(2) {
              animation-delay: 0.2s;
            }

            .typing-dot:nth-child(3) {
              animation-delay: 0.4s;
            }

            @keyframes typingAnimation {
              0%, 60%, 100% { transform: translateY(0); }
              30% { transform: translateY(-3px); }
            }

            /* Specializations Section */
            .section {
              padding: 120px 5%;
              position: relative;
            }

            .section-title {
              text-align: center;
              font-size: 2.5rem;
              margin-bottom: 20px;
              font-weight: 600;
              background: linear-gradient(to right, #8b5cf6, #c4b5fd);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              position: relative;
              letter-spacing: -0.5px;
            }

            .section-title::after {
              content: '';
              position: absolute;
              bottom: -12px;
              left: 50%;
              transform: translateX(-50%);
              width: 60px;
              height: 2px;
              background: var(--gradient);
            }

            .section-subtitle {
              text-align: center;
              font-size: 1.1rem;
              color: var(--gray);
              max-width: 700px;
              margin: 0 auto 60px;
              opacity: 0.9;
              font-weight: 300;
            }

            .specializations-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 25px;
              max-width: 1200px;
              margin: 0 auto;
            }

            .specialization-card {
              background: var(--card-bg);
              padding: 35px 25px;
              border-radius: 12px;
              box-shadow: var(--shadow);
              transition: all 0.4s ease;
              position: relative;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(10px);
            }

            .specialization-card:hover {
              transform: translateY(-10px);
              box-shadow: var(--shadow-lg);
              border-color: rgba(124, 58, 237, 0.3);
            }

            .specialization-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: var(--gradient);
            }

            .specialization-icon {
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(236, 72, 153, 0.1));
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              color: var(--primary);
              font-size: 1.5rem;
              transition: all 0.3s;
            }

            .specialization-card:hover .specialization-icon {
              transform: translateY(-5px);
              background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(236, 72, 153, 0.2));
            }

            .specialization-card h3 {
              font-size: 1.4rem;
              margin-bottom: 12px;
              color: white;
              font-weight: 600;
            }

            .specialization-card p {
              font-size: 1rem;
              color: var(--gray);
              margin-bottom: 20px;
              font-weight: 300;
            }

            .specialization-link {
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--primary);
              font-weight: 500;
              text-decoration: none;
              font-size: 0.95rem;
              transition: all 0.3s;
            }

            .specialization-link:hover {
              gap: 10px;
              color: var(--primary-light);
            }

            /* Communication Studio */
            .communication-studio {
              background: linear-gradient(135deg, #0f172a 0%, #1a1b2f 100%);
              color: white;
              text-align: center;
              position: relative;
              overflow: hidden;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .communication-studio::before {
              content: '';
              position: absolute;
              top: -100px;
              right: -100px;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%);
            }

            .communication-studio::after {
              content: '';
              position: absolute;
              bottom: -100px;
              left: -100px;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            }

            .communication-studio .section-title {
              color: white;
              -webkit-text-fill-color: white;
              background: none;
            }

            .communication-studio .section-subtitle {
              color: rgba(255, 255, 255, 0.8);
            }

            .why-progrify {
              max-width: 1000px;
              margin: 60px auto;
              text-align: left;
              padding: 0 5%;
            }

            .why-progrify h3 {
              font-size: 1.8rem;
              margin-bottom: 30px;
              color: white;
              text-align: center;
              position: relative;
              display: inline-block;
              left: 50%;
              transform: translateX(-50%);
              font-weight: 600;
            }

            .why-progrify h3::after {
              content: '';
              position: absolute;
              bottom: -8px;
              left: 0;
              width: 100%;
              height: 2px;
              background: var(--secondary);
            }

            .advantages-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 25px;
              margin-top: 40px;
            }

            .advantage-card {
              background: rgba(255, 255, 255, 0.03);
              border-radius: 12px;
              padding: 30px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.05);
              transition: all 0.4s ease;
              text-align: left;
            }

            .advantage-card:hover {
              transform: translateY(-5px);
              background: rgba(255, 255, 255, 0.07);
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              border-color: rgba(124, 58, 237, 0.3);
            }

            .advantage-icon {
              width: 50px;
              height: 50px;
              background: var(--gradient);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              color: white;
              font-size: 1.3rem;
            }

            .advantage-card h4 {
              font-size: 1.2rem;
              margin-bottom: 12px;
              color: white;
              font-weight: 600;
            }

            .advantage-card p {
              color: rgba(255, 255, 255, 0.7);
              font-size: 0.95rem;
              line-height: 1.6;
              font-weight: 300;
            }

            /* Testimonials */
            .testimonials-container {
              display: flex;
              gap: 25px;
              overflow-x: auto;
              padding: 20px 0;
              scroll-snap-type: x mandatory;
            }

            .testimonial-card {
              min-width: 320px;
              background: var(--card-bg);
              padding: 35px 25px;
              border-radius: 12px;
              box-shadow: var(--shadow);
              scroll-snap-align: start;
              border: 1px solid rgba(255, 255, 255, 0.05);
              transition: all 0.3s;
            }

            .testimonial-card:hover {
              transform: translateY(-5px);
              box-shadow: var(--shadow-lg);
            }

            .testimonial-header {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 20px;
            }

            .testimonial-avatar {
              width: 55px;
              height: 55px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid var(--primary);
            }

            .testimonial-author {
              font-weight: 600;
              font-size: .9rem;
              color: white;
            }

            .testimonial-role {
              font-size: 0.85rem;
              color: var(--gray);
              font-weight: 300;
            }

            .testimonial-rating {
              color: var(--secondary);
              margin-bottom: 12px;
              font-size: 1rem;
            }

            .testimonial-card p {
              color: rgba(255, 255, 255, 0.8);
              font-weight: 300;
              font-size: 0.95rem;
            }

            /* CTA Section */
            .cta {
              background: linear-gradient(135deg, #0f172a 0%, #1a1b2f 100%);
              color: white;
              text-align: center;
              padding: 100px 5%;
              position: relative;
              overflow: hidden;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .cta::before {
              content: '';
              position: absolute;
              top: -100px;
              right: -100px;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%);
            }

            .cta::after {
              content: '';
              position: absolute;
              bottom: -100px;
              left: -100px;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            }

            .cta .section-title {
              color: white;
              -webkit-text-fill-color: white;
              background: none;
              position: relative;
              z-index: 1;
            }

            .cta .section-subtitle {
              color: rgba(255, 255, 255, 0.8);
              position: relative;
              z-index: 1;
            }

            .cta-btns {
              display: flex;
              justify-content: center;
              gap: 20px;
              position: relative;
              z-index: 1;
            }

            .cta .btn {
              background: var(--gradient);
              color: white;
              font-weight: 500;
            }

            .cta .btn-outline {
              background: transparent;
              color: white;
              border: 1px solid white;
            }

            .cta .btn-outline:hover {
              background: white;
              color: var(--dark);
            }

            /* Footer */
            footer {
              background: var(--darker);
              color: white;
              padding: 80px 5% 40px;
              position: relative;
            }

            .footer-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 40px;
              max-width: 1200px;
              margin: 0 auto 50px;
            }

            .footer-col h4 {
              font-size: 1.2rem;
              margin-bottom: 20px;
              position: relative;
              padding-bottom: 12px;
              color: white;
              font-weight: 600;
            }

            .footer-col h4::after {
              content: '';
              position: absolute;
              left: 0;
              bottom: 0;
              width: 40px;
              height: 2px;
              background: var(--primary);
            }

            .footer-links {
              list-style: none;
            }

            .footer-links li {
              margin-bottom: 12px;
            }

            .footer-links a {
              color: rgba(255, 255, 255, 0.6);
              text-decoration: none;
              transition: all 0.3s;
              font-weight: 300;
            }

            .footer-links a:hover {
              color: white;
              padding-left: 5px;
            }

            .social-links {
              display: flex;
              gap: 15px;
              margin-top: 20px;
            }

            .social-links a {
              color: white;
              background: rgba(255, 255, 255, 0.05);
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s;
            }

            .social-links a:hover {
              background: var(--primary);
              transform: translateY(-3px);
            }

            .footer-bottom {
              text-align: center;
              padding-top: 40px;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
              color: rgba(255, 255, 255, 0.5);
              font-size: 0.9rem;
              font-weight: 300;
            }

            /* Modal for Agent Switching */
            .modal {
              display: none;
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.7);
              z-index: 2000;
              justify-content: center;
              align-items: center;
              backdrop-filter: blur(5px);
            }

            .modal-content {
              background: var(--card-bg);
              padding: 35px;
              border-radius: 12px;
              max-width: 450px;
              width: 90%;
              box-shadow: var(--shadow-lg);
              position: relative;
              border: 1px solid rgba(255, 255, 255, 0.05);
              animation: fadeIn 0.3s ease;
              backdrop-filter: blur(10px);
            }

            .modal-content::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: var(--gradient);
            }

            .close-modal {
              position: absolute;
              top: 15px;
              right: 15px;
              font-size: 1.5rem;
              cursor: pointer;
              color: var(--gray);
              transition: all 0.3s;
            }

            .close-modal:hover {
              color: var(--primary);
              transform: rotate(90deg);
            }

            /* Connection status indicator */
            .connection-status {
              position: fixed;
              bottom: 20px;
              right: 20px;
              padding: 10px 15px;
              border-radius: 8px;
              background: var(--card-bg);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              font-size: 0.9rem;
              display: flex;
              align-items: center;
              gap: 8px;
              z-index: 1000;
            }

            .connection-status.connected {
              color: var(--success);
            }

            .connection-status.disconnected {
              color: var(--danger);
            }

            .connection-status.connecting {
              color: var(--secondary);
            }

            /* Responsive Design */
            @media (max-width: 1200px) {
              .hero {
                padding: 150px 5% 80px;
              }
            }

            @media (max-width: 992px) {
              .hero {
                flex-direction: column;
                text-align: center;
                padding: 150px 5% 60px;
              }

              .hero-btns, .stats {
                justify-content: center;
              }

              .hero-text {
                max-width: 100%;
              }

              .hero-animation {
                max-width: 100%;
              }
            }

            @media (max-width: 768px) {
              .hero-text h1 {
                font-size: 2.8rem;
              }

              .hero-btns {
                flex-direction: column;
                gap: 15px;
              }

              .section-title {
                font-size: 2rem;
              }

              nav ul {
                display: none;
              }

              .testimonial-card {
                min-width: 280px;
              }

              .cta-btns {
                flex-direction: column;
                align-items: center;
              }
            }

            @media (max-width: 576px) {
              .hero-text h1 {
                font-size: 2.2rem;
              }

              .hero-text p {
                font-size: 1rem;
              }

              .stats {
                flex-direction: column;
                gap: 20px;
              }

              .section {
                padding: 80px 5%;
              }

              .section-title {
                font-size: 1.8rem;
              }
            }

            /* Animations */
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }

            .floating {
              animation: float 3s ease-in-out infinite;
            }
          `}</style>
      </Head>
      <>
        {/* Header */}
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
            <button className="btn" id="talkToAI"><i className="fas fa-microphone"></i> Talk to AI</button>
          </div>
        </header>

        {/* Hero Section */}
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
                    <i className="fas fa-home"></i>
                  </div>
                  <div>
                    <div className="ai-name">Home Agent</div>
                    <div className="ai-role">Your AI Concierge</div>
                  </div>
                </div>
                <button className="btn" style={{padding: '8px 15px', fontSize: '0.9rem'}} id="switchAgentBtn">
                  <i className="fas fa-random"></i> Switch Agent
                </button>
              </div>
              <div className="ai-message" id="agentMessage">
                <p>Welcome to Progrify! I'm your Home Agent. I can connect you with our specialized agents:</p>
                <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
                  <li><strong>Prompt Engineer</strong> - Master AI communication</li>
                  <li><strong>Coding Assistant</strong> - Build better, faster</li>
                  <li><strong>Product Builder</strong> - Create digital products</li>
                  <li><strong>Sales Coach</strong> - Practice client interactions</li>
                </ul>
                <p style={{marginTop: '10px'}}>What would you like to work on today?</p>
              </div>
              <div className="typing-indicator" id="typingIndicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
              <div className="user-input">
                <input type="text" id="userInput" placeholder="Type or speak your request..." />
                <div className="input-actions">
                  <button className="voice-btn" id="voiceBtn"><i className="fas fa-microphone"></i></button>
                  <button className="send-btn" id="sendBtn"><i className="fas fa-paper-plane"></i></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Specializations Section */}
        <section className="section" id="specializations">
          <h2 className="section-title">Your AI Specialists</h2>
          <p className="section-subtitle">Four powerful agents. One seamless experience.</p>

          <div className="specializations-grid">
            <div className="specialization-card" data-agent="prompt">
              <div className="specialization-icon">
                <i className="fas fa-terminal"></i>
              </div>
              <h3>Prompt Engineering</h3>
              <p>Master the art of AI communication. Craft perfect prompts that generate exactly what you need across different AI systems.</p>
              <a href="/prompt.html" className="specialization-link">Connect to Agent <i className="fas fa-arrow-right"></i></a>
            </div>

            <div className="specialization-card" data-agent="coding">
              <div className="specialization-icon">
                <i className="fas fa-code"></i>
              </div>
              <h3>AI-Assisted Coding</h3>
              <p>Build applications with an AI pair programmer that helps you write, debug, and optimize code in real-time.</p>
              <a href="/coding.html" className="specialization-link">Connect to Agent <i className="fas fa-arrow-right"></i></a>
            </div>

            <div className="specialization-card" data-agent="product">
              <div className="specialization-icon">
                <i className="fas fa-cube"></i>
              </div>
              <h3>Digital Product Builder</h3>
              <p>From concept to launch - build digital products with AI guidance on design, development, and deployment.</p>
              <a href="/product.html" className="specialization-link">Connect to Agent <i className="fas fa-arrow-right"></i></a>
            </div>

            <div className="specialization-card" data-agent="sales">
              <div className="specialization-icon">
                <i className="fas fa-handshake"></i>
              </div>
              <h3>AI Sales Coach</h3>
              <p>Practice sales conversations with realistic AI clients that adapt to your pitch and provide detailed feedback.</p>
              <a href="/sales.html" className="specialization-link">Connect to Agent <i className="fas fa-arrow-right"></i></a>
            </div>
          </div>
        </section>

        {/* <!-- Communication Studio Section --> */}
        <section className="section communication-studio" id="studio">
          <h2 className="section-title">Why Choose Progrify?</h2>
          <p className="section-subtitle">The most advanced AI sales training platform with real-world results</p>

          <div className="why-progrify">
            <h3>Our Unique Advantages</h3>
            <div className="advantages-grid">
              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-brain"></i>
                </div>
                <h4>Industry-Leading AI</h4>
                <p>Our sales AI is trained on thousands of real sales calls and adapts to your specific industry, product, and selling style.</p>
              </div>

              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h4>Proven Results</h4>
                <p>Users see an average 42% improvement in close rates within 90 days of using our sales coaching platform.</p>
              </div>

              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-user-tie"></i>
                </div>
                <h4>Real-World Scenarios</h4>
                <p>Practice with AI that simulates actual buyer personas, objections, and negotiation tactics from your market.</p>
              </div>

              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <h4>Personalized Coaching</h4>
                <p>Get tailored feedback on your tone, pacing, objection handling, and closing techniques.</p>
              </div>

              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-lightbulb"></i>
                </div>
                <h4>Continuous Improvement</h4>
                <p>Our AI learns from your progress and adapts training to focus on your weakest areas.</p>
              </div>

              <div className="advantage-card">
                <div className="advantage-icon">
                  <i className="fas fa-rocket"></i>
                </div>
                <h4>Rapid Onboarding</h4>
                <p>Get your entire sales team trained and productive with AI in days, not months.</p>
              </div>
            </div>
          </div>
        </section>

        {/* <!-- Testimonials --> */}
        <section className="section" id="testimonials">
          <h2 className="section-title">Transformations You Can Trust</h2>
          <p className="section-subtitle">Hear from professionals who've leveled up with Progrify</p>

          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Sarah J." className="testimonial-avatar" />
                <div>
                  <div className="testimonial-author">Sarah J.</div>
                  <div className="testimonial-role">Lead Developer</div>
                </div>
              </div>
              <div className="testimonial-rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p>"The coding assistant helped me reduce debugging time by 70% and ship features twice as fast. It's like having a senior developer available 24/7."</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Michael T." className="testimonial-avatar" />
                <div>
                  <div className="testimonial-author">Michael T.</div>
                  <div className="testimonial-role">Sales Director</div>
                </div>
              </div>
              <div className="testimonial-rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p>"After 3 months practicing with the AI Sales Coach, my close rate increased from 22% to 37%. The realistic roleplays were game-changing."</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Priya K." className="testimonial-avatar" />
                <div>
                  <div className="testimonial-author">Priya K.</div>
                  <div className="testimonial-role">Product Manager</div>
                </div>
              </div>
              <div className="testimonial-rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star-half-alt"></i>
              </div>
              <p>"We built and launched our MVP in 6 weeks using the Digital Product Builder. The AI guidance helped us avoid costly mistakes and focus on what matters."</p>
            </div>
          </div>
        </section>

        {/* <!-- CTA Section --> */}
        <section className="cta">
          <h2 className="section-title">Ready to 10X Your Productivity?</h2>
          <p className="section-subtitle">Join the AI revolution and start building your future today</p>
          <div className="cta-btns">
            <button className="btn"><i className="fas fa-bolt"></i> Start Free Trial</button>
            <button className="btn-outline"><i className="fas fa-play-circle"></i> Watch Demo</button>
          </div>
          <div className="free-label" style={{color: 'white', marginTop: '15px'}}>
            <i className="fas fa-check-circle"></i> No credit card required
          </div>
        </section>

        {/* <!-- Footer --> */}
        <footer>
          <div className="footer-grid">
            <div className="footer-col">
              <div className="logo">
                <i className="fas fa-robot logo-icon"></i>
                <span>Progrify</span>
              </div>
              <p style={{marginTop: '20px'}}>Specialized AI agents for the modern builder, creator, and seller.</p>
              <div className="social-links" style={{marginTop: '20px'}}>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                <a href="#"><i className="fab fa-youtube"></i></a>
                <a href="#"><i className="fab fa-discord"></i></a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Agents</h4>
              <ul className="footer-links">
                <li><a href="#">Prompt Engineering</a></li>
                <li><a href="#">AI-Assisted Coding</a></li>
                <li><a href="#">Digital Product Builder</a></li>
                <li><a href="#">AI Sales Coach</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul className="footer-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Webinars</a></li>
                <li><a href="#">API Docs</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <ul className="footer-links">
                <li><a href="#">Terms</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Cookies</a></li>
                <li><a href="#">Copyright</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 Progrify, Inc. All rights reserved. The future of productivity is here.</p>
          </div>
        </footer>

        {/* <!-- Agent Switching Modal --> */}
        <div className="modal" id="agentModal">
          <div className="modal-content">
            <span className="close-modal" id="closeModal">&times;</span>
            <h3>Switch AI Specialist</h3>
            <p>Select the specialized agent you'd like to work with:</p>
            <div className="agent-options" style={{marginTop: '20px'}}>
              <button className="btn-outline agent-option" style={{width: '100%', marginBottom: '10px', textAlign: 'left'}} data-agent="prompt">
                <i className="fas fa-terminal"></i> Prompt Engineering
              </button>
              <button className="btn-outline agent-option" style={{width: '100%', marginBottom: '10px', textAlign: 'left'}} data-agent="coding">
                <i className="fas fa-code"></i> AI-Assisted Coding
              </button>
              <button className="btn-outline agent-option" style={{width: '100%', marginBottom: '10px', textAlign: 'left'}} data-agent="product">
                <i className="fas fa-cube"></i> Digital Product Builder
              </button>
              <button className="btn-outline agent-option" style={{width: '100%', marginBottom: '10px', textAlign: 'left'}} data-agent="sales">
                <i className="fas fa-handshake"></i> AI Sales Coach
              </button>
              <button className="btn agent-option" style={{width: '100%', marginTop: '20px'}} data-agent="home">
                <i className="fas fa-home"></i> Return to Home Agent
              </button>
            </div>
          </div>
        </div>

        {/* <!-- Connection status indicator --> */}
        <div className="connection-status disconnected" id="connectionStatus">
          <i className="fas fa-circle"></i>
          <span>Disconnected</span>
        </div>
      </>
    </>
  );
}
