let AUTH_TOKEN = '';
let JELLYFIN_SERVER = '';
const USERNAME = localStorage.getItem('jellyfinUsername') || '';

async function fetchLibraryItems() {
    try {
        const response = await fetch(`${JELLYFIN_SERVER}/Items`, {
            headers: {
                'X-Emby-Token': AUTH_TOKEN,
                'Accept': 'application/json'
            }
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return { Items: [] }; // Return empty array on error
    }
}

function createItemElement(item) {
    const div = document.createElement('div');
    div.className = 'item';
    div.textContent = item.Name;
    div.onclick = () => handleItemClick(item);
    return div;
}

function populateItems(items) {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = ''; // Clear previous items
    items.forEach(item => {
        container.appendChild(createItemElement(item));
    });
}

async function handleItemClick(item) {
    if (item.Type === 'Series') {
        const episodes = await fetchEpisodes(item.Id);
        if (episodes.length > 0) {
            const randomEpisode = episodes[Math.floor(Math.random() * episodes.length)];
            startPlayback(randomEpisode.Id);
        }
    } else if (item.Type === 'Movie') {
        startPlayback(item.Id);
    }
}

async function fetchEpisodes(seriesId) {
    try {
        const response = await fetch(`${JELLYFIN_SERVER}/Shows/${seriesId}/Episodes`, {
            headers: {
                'X-Emby-Token': API_TOKEN,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        return data.Items || [];
    } catch (error) {
        console.error('Failed to fetch episodes:', error);
        return [];
    }
}

function startPlayback(itemId) {
    // TODO: Implement actual playback based on your Jellyfin setup
    console.log('Starting playback for item ID:', itemId);
    alert(`Playback starting for item ID: ${itemId}`);
}

// Authentication functions
async function authenticateUser(serverUrl, username, password) {
    try {
        const authResponse = await fetch(`${serverUrl}/Users/authenticatebyname`, {
            method: 'POST',
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="Kids UI", Device="Browser", DeviceId="kids-ui-1", Version="1.0.0"`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Username: username,
                Pw: password
            })
        });

        if (!authResponse.ok) throw new Error('Login failed');
        
        const authData = await authResponse.json();
        return authData.AccessToken;
    } catch (error) {
        console.error('Authentication error:', error);
        alert('Login failed. Please check your credentials and server URL');
        throw error;
    }
}

async function handleLogin() {
    const serverUrl = document.getElementById('serverUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const token = await authenticateUser(serverUrl, username, password);
        AUTH_TOKEN = token;
        JELLYFIN_SERVER = serverUrl;
        
        // Store username and server URL in localStorage
        localStorage.setItem('jellyfinUsername', username);
        localStorage.setItem('jellyfinServer', serverUrl);
        
        // Show media content and hide login
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('itemsContainer').classList.remove('hidden');
        
        // Load library items
        const data = await fetchLibraryItems();
        populateItems(data.Items || []);
        
        // Register service worker after successful auth
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if we have stored credentials
        const storedServer = localStorage.getItem('jellyfinServer');
        const storedUsername = localStorage.getItem('jellyfinUsername');
        
        if (storedServer && storedUsername) {
            JELLYFIN_SERVER = storedServer;
            document.getElementById('serverUrl').value = storedServer;
            document.getElementById('username').value = storedUsername;
            document.getElementById('password').focus();
        } else {
            document.getElementById('serverUrl').focus();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
