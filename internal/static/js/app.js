const messagesContainer = document.getElementById('messagesContainer');
const loadingIndicator = document.getElementById('loading');

// Initialize SSE connection for real-time updates
let eventSource = null;
let events = [];

// Initialize the application
initializeApp();

function initializeApp() {
    // Load initial messages
    loadMessages();
    // Setup SSE connection
    setupSSE();
}

function setupSSE() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource('/api/events');

    eventSource.onmessage = function(event) {
        try {
            const eventData = JSON.parse(event.data);
            console.log(eventData);

            // Try to parse field for Payload and Context keys
            if (eventData.data.Payload) {
                eventData.data.Payload = JSON.parse(eventData.data.Payload);
            }
            if (eventData.data.Context) {
                eventData.data.Context = JSON.parse(eventData.data.Context);
            }

            addEventToUI(eventData);
        } catch (error) {
            console.error('Error parsing SSE event:', error);
        }
    };

    eventSource.onerror = function(error) {
        console.error('SSE connection error:', error);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            setupSSE();
        }, 5000);
    };

    eventSource.onopen = function() {
        console.log('SSE connection established');
    };
}

async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        const fetchedEvents = await response.json();

        events = fetchedEvents || [];
        renderMessages();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function addEventToUI(newEvent) {
    // Check if event already exists (to avoid duplicates)
    if (!events.find(evt => evt.id === newEvent.id)) {
        events.push(newEvent);
        renderMessages();
    }
}

function renderMessages() {
    if (!events || events.length === 0) {
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No events yet. Send one to get started!</p>
            </div>
        `;
        return;
    }

    messagesContainer.innerHTML = events.map(evt => {
        const date = new Date(evt.timestamp);
        const timeStr = date.toLocaleTimeString();

        // Extract meaningful data from the event
        const dataPreview = evt.data && evt.data.length > 0
            ? JSON.stringify(evt.data[0]).substring(0, 100)
            : 'N/A';

        return `
            <div class="message">
                <div class="message-header">
                    <span class="event-id">#${evt.id}</span>
                    <span class="event-title">${evt.data.Title}</span>
                    <span class="event-time">${timeStr}</span>
                </div>
                <div class="message-text">
                    <pre>${escapeHtml(JSON.stringify(evt.data, null, 2))}</pre>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Cleanup EventSource when page unloads
window.addEventListener('beforeunload', function() {
    if (eventSource) {
        eventSource.close();
    }
});
