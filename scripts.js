// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080' // Development
  : 'https://harry-potter-qna-with-cognee.onrender.com'; // Production (Replace with your actual Render URL)

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
const clearApiKeyBtn = document.getElementById('clear-api-key');
const apiKeyModal = document.getElementById('api-key-modal');
const openApiModalBtn = document.getElementById('open-api-modal');
const closeModal = document.querySelector('.close-modal');
const apiStatus = document.getElementById('api-status');
const settingsButton = document.getElementById('settings-button');
const apiKeyForm = document.getElementById('api-key-form');

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadApiKey();
    initializeChat();
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
async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    // If the key is masked (already saved), don't save it again
    if (apiKeyInput.dataset.filled === 'true') {
        hideApiKeyModal();
        return true;
    }
    
    if (!apiKey) {
        updateApiStatus('Please enter an API key', 'error');
        return false;
    }
    
    try {
        // Save the API key to local storage
        localStorage.setItem('openai_api_key', apiKey);
        updateApiStatus('Validating API key...', 'info');
        
        // Mask the key in the input
        apiKeyInput.value = '•'.repeat(apiKey.length);
        apiKeyInput.dataset.filled = 'true';
        
        // Start initialization which will validate the key
        const success = await startInitialization();
        
        if (success) {
            updateApiStatus('API key validated successfully!', 'success');
            setTimeout(hideApiKeyModal, 1000);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error saving API key:', error);
        updateApiStatus(`Error: ${error.message}`, 'error');
        localStorage.removeItem('openai_api_key');
        apiKeyInput.value = '';
        apiKeyInput.dataset.filled = 'false';
        return false;
    }
}

// Check initialization status
async function checkInitializationStatus() {
    try {
        const response = await fetch(getApiUrl('/api/status'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.initialized) {
            // Initialization complete
            updateApiStatus('Ready to answer your questions!', 'success');
            enableChatInput(true);
            return true;
        }
        
        if (data.initializing) {
            // Initialization in progress
            const statusMessage = data.status || 'Initializing';
            const progress = data.progress || 0;
            updateApiStatus(`${statusMessage} (${progress}%)`, 'info');
            
            // Check again in 1 second if still initializing
            setTimeout(checkInitializationStatus, 1000);
            return false;
        }
        
        // Not initialized, check if we have an API key to start initialization
        const apiKey = localStorage.getItem('openai_api_key');
        if (apiKey) {
            updateApiStatus('Starting initialization...', 'info');
            return await startInitialization();
        }
        
        // No API key, show prompt
        updateApiStatus('Please enter your OpenAI API key to begin', 'info');
        return false;
        
    } catch (error) {
        console.error('Error checking initialization status:', error);
        updateApiStatus(`Error: ${error.message}`, 'error');
        enableChatInput(false);
        return false;
    }
}

// Start initialization
async function startInitialization() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        updateApiStatus('No API key found', 'error');
        return false;
    }
    
    try {
        const response = await fetch(getApiUrl('/api/initialize'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'initialization_started' || data.status === 'initialization_in_progress') {
            // Start polling for status updates
            setTimeout(checkInitializationStatus, 1000);
            return true;
        }
        
        if (data.status === 'initialization_complete') {
            updateApiStatus('Ready to answer your questions!', 'success');
            enableChatInput(true);
            return true;
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        throw new Error('Unexpected response from server');
        
    } catch (error) {
        console.error('Error starting initialization:', error);
        updateApiStatus(`Initialization failed: ${error.message}`, 'error');
        enableChatInput(false);
        return false;
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
        const response = await fetch(getApiUrl('/api/ask'), {
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
        // Focus the input when modal is shown
        if (apiKeyInput) {
            apiKeyInput.focus();
        }
    }
}

function hideApiKeyModal() {
    if (apiKeyModal) {
        apiKeyModal.style.display = 'none';
        // Reset the input field
        if (apiKeyInput) {
            const savedKey = localStorage.getItem('openai_api_key');
            if (savedKey) {
                apiKeyInput.type = 'password';
                apiKeyInput.value = '•'.repeat(savedKey.length);
                apiKeyInput.dataset.filled = 'true';
            } else {
                apiKeyInput.value = '';
                apiKeyInput.dataset.filled = 'false';
            }
        }
    }
}

// Initialize API key from localStorage
function initApiKey() {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        // Show masked key in the input
        apiKeyInput.value = '•'.repeat(savedKey.length);
        apiKeyInput.dataset.filled = 'true';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Send button click
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Enter key in input field
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Save API key button
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await saveApiKey();
        });
    }
    
    // Clear API key button
    if (clearApiKeyBtn) {
        clearApiKeyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('openai_api_key');
            apiKeyInput.value = '';
            apiKeyInput.dataset.filled = 'false';
            updateApiStatus('API key cleared', 'info');
        });
    }
    
    // Open API key modal
    if (openApiModalBtn) {
        openApiModalBtn.addEventListener('click', showApiKeyModal);
    }
    
    // Close modal button
    if (closeModal) {
        closeModal.addEventListener('click', hideApiKeyModal);
    }
    
    // Close modal when clicking outside
    if (apiKeyModal) {
        window.addEventListener('click', (e) => {
            if (e.target === apiKeyModal) {
                hideApiKeyModal();
            }
        });
    }
    
    // API key input field handling
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', () => {
            // Remove any error state when user types
            if (apiKeyInput.classList.contains('error')) {
                apiKeyInput.classList.remove('error');
            }
        });
        
        // Handle API key input focus/blur for masking
        apiKeyInput.addEventListener('focus', () => {
            if (apiKeyInput.dataset.filled === 'true') {
                apiKeyInput.type = 'text';
                apiKeyInput.value = localStorage.getItem('openai_api_key') || '';
                apiKeyInput.dataset.filled = 'false';
            }
        });

        apiKeyInput.addEventListener('blur', () => {
            const savedKey = localStorage.getItem('openai_api_key');
            if (savedKey && apiKeyInput.value === savedKey) {
                apiKeyInput.type = 'password';
                apiKeyInput.value = '•'.repeat(savedKey.length);
                apiKeyInput.dataset.filled = 'true';
            }
        });
    }
    
    // Load any saved API key and check status
    const apiKey = localStorage.getItem('openai_api_key');
    if (apiKey) {
        updateApiStatus('Checking service status...', 'info');
        checkInitializationStatus();
    } else {
        updateApiStatus('Please enter your OpenAI API key to begin', 'info');
        showApiKeyModal();
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to open API key modal
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            showApiKeyModal();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && apiKeyModal && apiKeyModal.style.display === 'block') {
            hideApiKeyModal();
        }
    });
    
    // Initialize the chat
    initializeChat();
}

// Initialize chat
function initializeChat() {
    // Clear any existing messages
    chatMessages.innerHTML = '';
    
    // Add welcome message with better formatting
    const welcomeMessage = `Welcome to the Harry Potter Q&A Assistant! 

I'm your magical guide to the Wizarding World. I can help you with:

• Character backgrounds and relationships  
• Spells and their effects  
• Magical creatures and their lore  
• Plot details from all seven books  
• And much more!

To get started, please enter your **OpenAI API key** using the button in the top-right corner.`;
    
    addMessage(welcomeMessage, MESSAGE_TYPES.INFO);
  
  // Disable chat input until API key is set
  enableChatInput(false);
}

// Start the application
setupEventListeners();
