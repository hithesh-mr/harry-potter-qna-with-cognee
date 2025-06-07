// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080' // Development
  : ''; // Production

const API_ENDPOINT = `${API_BASE_URL}/api`;

// Ensure the API endpoint ends with a slash
const getApiUrl = (endpoint) => {
  const base = API_ENDPOINT.endsWith('/') ? API_ENDPOINT.slice(0, -1) : API_ENDPOINT;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiStatus = document.getElementById('api-status');
const apiKeyModal = document.getElementById('api-key-modal');
const closeModal = document.querySelector('.close');
const openApiModalBtn = document.getElementById('open-api-modal');

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadApiKey();
    checkInitializationStatus();
});

// Message types
const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot',
  INFO: 'info',
  ERROR: 'error',
  LOADING: 'loading',
};

// Add message to chat
function addMessage(message, type = MESSAGE_TYPES.BOT, id = '') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}-message`;
  
  if (id) {
    messageDiv.id = id;
  }
    
  if (type === MESSAGE_TYPES.LOADING) {
    messageDiv.innerHTML = `
      <div class="loading">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  } else {
    // Simple markdown-like formatting for **bold** and *italic*
    const formattedMessage = message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = formattedMessage;
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// Load API key from localStorage
function loadApiKey() {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey.replace(/./g, '•');
        apiKeyInput.dataset.filled = 'true';
    }
}

// Save API key to localStorage
function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    updateApiStatus('Please enter an API key', 'error');
    return;
  }
  
  // If the key is masked, don't save it again
  if (apiKeyInput.dataset.filled === 'true') {
    hideApiKeyModal();
    return;
  }
  
  // Show loading state
  updateApiStatus('Verifying API key...', 'info');
  
  // Test the API key
  testOpenAIApiKey(apiKey)
    .then(() => {
      // Save the key
      localStorage.setItem('openai_api_key', apiKey);
      apiKeyInput.value = apiKey.replace(/\./g, '•');
      apiKeyInput.dataset.filled = 'true';
      updateApiStatus('API key saved successfully!', 'success');
      
      // Hide modal after a short delay
      setTimeout(hideApiKeyModal, 1000);
      
      // Check initialization status
      checkInitializationStatus();
    })
    .catch((error) => {
      updateApiStatus(`Failed to verify API key: ${error.message}`, 'error');
    });
}

// Check initialization status
async function checkInitializationStatus() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) return;
    
    try {
        const response = await fetch(getApiUrl('/status'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check initialization status');
        }
        
        const data = await response.json();
        
        if (data.initialized) {
            updateApiStatus('Ready to answer your questions!', 'success');
            enableChatInput(true);
        } else if (data.initializing) {
            const statusMessage = data.status || 'Initializing';
            const progress = data.progress || 0;
            updateApiStatus(`${statusMessage} (${progress}%)`, 'info');
            
            // Check again in 2 seconds if still initializing
            setTimeout(checkInitializationStatus, 2000);
        } else if (data.error) {
            updateApiStatus(`Initialization error: ${data.error}`, 'error');
            enableChatInput(false);
        } else {
            // Not initialized, start initialization
            startInitialization();
        }
    } catch (error) {
        console.error('Error checking initialization status:', error);
        updateApiStatus('Error checking initialization status', 'error');
    }
}

// Start initialization
async function startInitialization() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) return;
    
    updateApiStatus('Starting initialization...', 'info');
    
    try {
        // Start initialization
        const response = await fetch(getApiUrl('/initialize'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.ok) {
            // Initialization started, check status again
            checkInitializationStatus();
        } else {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to start initialization');
        }
    } catch (error) {
        console.error('Error starting initialization:', error);
        updateApiStatus(`Initialization error: ${error.message}`, 'error');
    }
}

// Enable/disable chat input
function enableChatInput(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
  if (enabled) {
    userInput.placeholder = 'Ask me anything about the Harry Potter universe...';
    userInput.focus();
  } else {
    userInput.placeholder = 'Initializing...';
  }
}

// Send message to the backend
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        updateApiStatus('Please set your OpenAI API key first', 'error');
        showApiKeyModal();
        return;
    }
    
    // Add user message to chat
    addMessage(message, MESSAGE_TYPES.USER);
    userInput.value = '';
    
    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    addMessage('Thinking...', MESSAGE_TYPES.LOADING, loadingId);
    
    try {
        const response = await fetch(getApiUrl('/ask'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ question: message })
        });
        
      // Remove loading indicator
      const loadingElement = document.getElementById(loadingId);
      if (loadingElement) loadingElement.remove();
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to get response');
      }
      
      const data = await response.json();
      
      // Add bot response to chat
      if (data.answer) {
        addMessage(data.answer, MESSAGE_TYPES.BOT);
        
        // Show sources if available
        if (data.sources && data.sources.length > 0) {
          const sourcesText = `\n\nSources:\n${data.sources
            .map((s, i) => `${i + 1}. ${s.title || `Source ${i + 1}`}`)
            .join('\n')}`;
          addMessage(sourcesText, MESSAGE_TYPES.INFO);
        }
      } else {
        throw new Error('No answer received');
      }
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage(`Sorry, I encountered an error: ${error.message}`, MESSAGE_TYPES.ERROR);
    }
}

// Test OpenAI API key
async function testOpenAIApiKey(apiKey) {
    try {
        const response = await fetch(getApiUrl('/health'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'API key verification failed');
        }
        
        return true;
    } catch (error) {
        console.error('Error testing API key:', error);
        throw new Error('Failed to verify API key. Please check your API key and try again.');
    }
}

// Update API status message
function updateApiStatus(message, type = '') {
    if (!apiStatus) return;
    
    apiStatus.textContent = message;
    apiStatus.className = 'api-status';
    
    if (type) {
        apiStatus.classList.add(type);
    }
    
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (apiStatus.textContent === message) {
        apiStatus.textContent = '';
        apiStatus.className = 'api-status';
      }
    }, 5000);
  }
}

// Show/hide API key modal
function showApiKeyModal() {
    if (apiKeyModal) {
        apiKeyModal.style.display = 'block';
        apiKeyInput.focus();
    }
}

function hideApiKeyModal() {
    if (apiKeyModal) {
        apiKeyModal.style.display = 'none';
    }
}

// Set up event listeners
function setupEventListeners() {
  // Chat input
  if (sendButton) sendButton.addEventListener('click', sendMessage);
  
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
  
  // API key modal
  if (openApiModalBtn) openApiModalBtn.addEventListener('click', showApiKeyModal);
  if (closeModal) closeModal.addEventListener('click', hideApiKeyModal);
  if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
      hideApiKeyModal();
    }
  });
  
  // Handle API key input
  if (apiKeyInput) {
    apiKeyInput.addEventListener('focus', () => {
      if (apiKeyInput.dataset.filled === 'true') {
        apiKeyInput.value = '';
        apiKeyInput.dataset.filled = 'false';
      }
    });
    
    apiKeyInput.addEventListener('blur', () => {
      if (!apiKeyInput.value && apiKeyInput.dataset.filled !== 'true') {
        const savedKey = localStorage.getItem('openai_api_key');
        if (savedKey) {
          apiKeyInput.value = savedKey.replace(/\./g, '•');
          apiKeyInput.dataset.filled = 'true';
        }
      }
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to open API key modal
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      showApiKeyModal();
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && apiKeyModal.style.display === 'block') {
      hideApiKeyModal();
    }
  });
}

// Initialize chat
function initializeChat() {
  // Add welcome message
  addMessage(
    'Welcome to the Harry Potter Q&A! ' +
    'I can answer questions about the Harry Potter universe. ' +
    'Please enter your OpenAI API key to get started.\n' +
    'You can get an API key from [OpenAI](https://platform.openai.com/api-keys).',
    MESSAGE_TYPES.INFO,
  );
  
  // Disable chat input until API key is set
  enableChatInput(false);
}

// Start the application
initializeChat();
