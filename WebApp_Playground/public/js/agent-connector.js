document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration ---
  const LIVEKIT_URL = 'ws://localhost:7880';

  // --- State Management ---
  let currentRoom = null;
  let currentAgent = 'home'; // The default agent
  let localAudioStream = null;

  // --- Agent Definitions (as seen in home.html) ---
  const agents = {
    home: {
      name: 'Home Agent',
      role: 'Your AI Concierge',
      icon: 'fa-home',
      greeting: `Welcome to Progrify! I'm your Home Agent. I can connect you with our specialized agents... What would you like to work on today?`,
    },
    prompt: {
      name: 'Prompt Engineer',
      role: 'AI Communication Specialist',
      icon: 'fa-terminal',
      greeting: `Hello! I'm your Prompt Engineering Agent. How can I help you craft the perfect prompt?`,
    },
    coding: {
      name: 'Coding Assistant',
      role: 'AI Pair Programmer',
      icon: 'fa-code',
      greeting: `Hi there! I'm your AI Coding Assistant. Let's write some code. What's your project?`,
    },
    product: {
      name: 'Product Builder',
      role: 'Digital Product Specialist',
      icon: 'fa-cube',
      greeting: `Welcome to the Digital Product Builder! What product are we building today?`,
    },
    sales: {
      name: 'Sales Coach',
      role: 'AI Client Simulator',
      icon: 'fa-handshake',
      greeting: `Hello! I'm your AI Sales Coach. Ready to practice your sales skills?`,
    }
  };

  // --- DOM Element Caching ---
  const talkToAIBtn = document.getElementById('talkToAI');
  const connectionStatus = document.getElementById('connectionStatus');
  const agentContainer = document.getElementById('homeAgent');
  const agentNameEl = agentContainer.querySelector('.ai-name');
  const agentRoleEl = agentContainer.querySelector('.ai-role');
  const agentAvatarEl = agentContainer.querySelector('.ai-avatar i');
  const agentMessageEl = document.getElementById('agentMessage');
  const typingIndicator = document.getElementById('typingIndicator');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const switchAgentBtn = document.getElementById('switchAgentBtn');
  const agentModal = document.getElementById('agentModal');
  const closeModal = document.getElementById('closeModal');
  const agentOptions = document.querySelectorAll('.agent-option');
  const specializationCards = document.querySelectorAll('.specialization-card');

  // --- Core Functions ---

  /**
   * Fetches a secure token from our API endpoint.
   */
  async function getAuthToken() {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Sending participant_name and room_name is optional
          // The server will generate them if not provided.
          participantName: 'webapp-user-' + Math.random().toString(36).substring(7),
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch token: ${errorText}`);
      }
      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error("Token fetch error:", error);
      updateConnectionStatus('disconnected', `Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Connects to the LiveKit room and sets up all listeners.
   */
  async function connectToAgent() {
    if (currentRoom) return;

    updateConnectionStatus('connecting', 'Connecting...');
    const token = await getAuthToken();
    if (!token) return;

    const room = new LiveKitClient.Room({
      adaptiveStream: true,
      dynacast: true,
    });

    try {
      await room.connect(LIVEKIT_URL, token);
      updateConnectionStatus('connected', 'Connected');
      currentRoom = room;

      // Setup media
      localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = new LiveKitClient.LocalAudioTrack(localAudioStream.getAudioTracks()[0]);
      await room.localParticipant.publishTrack(audioTrack);

      // Setup room event listeners
      room
        .on(LiveKitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(LiveKitClient.RoomEvent.DataReceived, handleDataReceived)
        .on(LiveKitClient.RoomEvent.Disconnected, handleDisconnect)
        .on(LiveKitClient.RoomEvent.ConnectionStateChanged, (state) => {
            if (state === LiveKitClient.ConnectionState.Connected) {
                updateConnectionStatus('connected', 'Connected');
                talkToAIBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Disconnect';
            }
        });

      updateAgentUI(currentAgent, true); // Greet on connect

    } catch (error) {
      console.error('Connection failed:', error);
      updateConnectionStatus('disconnected', `Failed: ${error.message}`);
      currentRoom = null;
    }
  }

  /**
   * Disconnects from the LiveKit room and cleans up.
   */
  async function disconnectFromAgent() {
    if (currentRoom) {
      await currentRoom.disconnect();
    }
  }

  function handleDisconnect() {
    if (localAudioStream) {
      localAudioStream.getTracks().forEach(track => track.stop());
      localAudioStream = null;
    }
    const existingAudioElements = document.querySelectorAll('audio[data-lk-track-id]');
    existingAudioElements.forEach(el => el.remove());

    currentRoom = null;
    updateConnectionStatus('disconnected', 'Disconnected');
    talkToAIBtn.innerHTML = '<i class="fas fa-microphone"></i> Talk to AI';
    updateAgentUI('home', true); // Reset to home agent
  }


  // --- Event Handlers ---

  function handleTrackSubscribed(track, publication, participant) {
    if (track.kind === 'audio') {
      const audioElement = track.attach();
      audioElement.dataset.lkTrackId = track.sid;
      document.body.appendChild(audioElement);
    }
  }

  function handleDataReceived(payload, participant, topic) {
    if (topic === 'lk-agent-chat') {
        const message = new TextDecoder().decode(payload);
        showTyping(false);
        setAgentMessage(message);
    }
  }

  function handleUserInput() {
    const text = userInput.value.trim();
    if (!text || !currentRoom || currentRoom.state !== LiveKitClient.ConnectionState.Connected) return;

    // Send the message over the data channel
    const encodedMessage = new TextEncoder().encode(text);
    currentRoom.localParticipant.publishData(encodedMessage, 'lk-user-text');

    setAgentMessage(`<strong>You:</strong> ${text}`);
    showTyping(true);
    userInput.value = '';
  }

  function handleSwitchAgent(agentKey) {
      if (!agents[agentKey]) return;

      updateAgentUI(agentKey, true);

      if (currentRoom && currentRoom.state === LiveKitClient.ConnectionState.Connected) {
          const command = `switch to ${agentKey}`;
          const encodedCommand = new TextEncoder().encode(command);
          currentRoom.localParticipant.publishData(encodedCommand, 'lk-user-text');
          showTyping(true);
      }

      agentModal.style.display = 'none';
  }


  // --- UI Update Functions ---

  function updateConnectionStatus(status, message) {
    connectionStatus.className = `connection-status ${status}`;
    const icon = connectionStatus.querySelector('i');
    const span = connectionStatus.querySelector('span');
    span.textContent = message;
  }

  function updateAgentUI(agentKey, showGreeting = false) {
    const agent = agents[agentKey];
    if (!agent) return;

    currentAgent = agentKey;
    agentNameEl.textContent = agent.name;
    agentRoleEl.textContent = agent.role;
    agentAvatarEl.className = `fas ${agent.icon}`;

    if (showGreeting) {
      setAgentMessage(agent.greeting);
    }
  }

  function showTyping(isActive) {
      typingIndicator.classList.toggle('active', isActive);
  }

  function setAgentMessage(html) {
      agentMessageEl.innerHTML = html;
  }

  // --- Event Listeners Setup ---

  talkToAIBtn.addEventListener('click', () => {
    if (currentRoom) {
      disconnectFromAgent();
    } else {
      connectToAgent();
    }
  });

  sendBtn.addEventListener('click', handleUserInput);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleUserInput();
    }
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
      handleSwitchAgent(agentKey);
    });
  });

  specializationCards.forEach(card => {
    card.addEventListener('click', () => {
      const agentKey = card.dataset.agent;
      handleSwitchAgent(agentKey);
      agentContainer.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // --- Initial State ---
  updateAgentUI('home', true);
  updateConnectionStatus('disconnected', 'Disconnected');
});
