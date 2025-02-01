let AUTH_TOKEN = '';
let JELLYFIN_SERVER = '';
let AUTH_DATA = '';
const USERNAME = localStorage.getItem('jellyfinUsername') || '';

async function fetchLibraryItems() {
    try {
        const userId = localStorage.getItem('jellyfinUserId');
        const response = await fetch(`${JELLYFIN_SERVER}/Users/${userId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&SortBy=SortName`, {
            headers: {
                'X-Emby-Token': AUTH_TOKEN,
                'Accept': 'application/json'
            },
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
                'X-Emby-Token': AUTH_TOKEN,
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

async function startPlayback(itemId) {
    try {
        const response = await fetch(`${JELLYFIN_SERVER}/Items/${itemId}/PlaybackInfo`, {
            headers: {
                'X-Emby-Token': AUTH_TOKEN,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        
        const videoPlayer = document.getElementById('videoPlayer');
        const mediaSource = data.MediaSources[0];
        const videoUrl = `${JELLYFIN_SERVER}/Videos/${itemId}/stream?Container=${mediaSource.Container}&Static=true&MediaSourceId=${mediaSource.Id}&api_key=${AUTH_TOKEN}`;

        videoPlayer.innerHTML = '';
        videoPlayer.src = videoUrl;
        videoPlayer.play();
        
        document.getElementById('itemsContainer').classList.add('hidden');
        document.getElementById('videoContainer').classList.remove('hidden');
        
        videoPlayer.addEventListener('ended', showItemsList);
        videoPlayer.addEventListener('error', () => {
            alert('Playback failed. Please try another item.');
            showItemsList();
        });
    } catch (error) {
        console.error('Playback failed:', error);
        alert('Playback failed. Please try another item.');
        showItemsList();
    }
}

function showItemsList() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    
    document.getElementById('videoContainer').classList.add('hidden');
    document.getElementById('itemsContainer').classList.remove('hidden');
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
	AUTH_DATA = authData;
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
        
        // Store user details in localStorage
        localStorage.setItem('jellyfinUserId', AUTH_DATA.User.Id);
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
