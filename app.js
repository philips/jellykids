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
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('jellyfinUserId');
                localStorage.removeItem('jellyfinToken');
                window.location.reload();
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('jellyfinUserId');
                localStorage.removeItem('jellyfinToken');
                window.location.reload();
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.Items || [];
    } catch (error) {
        console.error('Failed to fetch episodes:', error);
        return [];
    }
}

async function startPlayback(itemId) {
    try {
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.innerHTML = '';
        videoPlayer.setAttribute('playsinline', '');
        videoPlayer.muted = true;

        const mediaSource = isSafari() ? 
            `${JELLYFIN_SERVER}/Videos/${itemId}/master.m3u8?` + new URLSearchParams({
                DeviceId: 'kids-ui-' + Math.random().toString(36).substring(2, 15),
                MediaSourceId: itemId,
                api_key: AUTH_TOKEN,
                PlaySessionId: Math.random().toString(36).substring(2, 15),
                VideoCodec: 'h264',
                AudioCodec: 'aac',
                SubtitleMethod: 'Encode',
                SegmentContainer: 'mp4',
                MinSegments: 2,
                Tag: Date.now()
            }) :
            `${JELLYFIN_SERVER}/Videos/${itemId}/stream?static=true&mediaSourceId=${itemId}&api_key=${AUTH_TOKEN}`;

        const source = document.createElement('source');
        source.src = mediaSource;
        source.type = isSafari() ? 'application/vnd.apple.mpegurl' : 'video/mp4';

        videoPlayer.appendChild(source);
        videoPlayer.load();

        if (isSafari()) {
            videoPlayer.addEventListener('loadedmetadata', () => {
                videoPlayer.play().catch(handlePlayError);
            }, { once: true });
        } else {
            videoPlayer.play().catch(handlePlayError);
        }

        document.getElementById('itemsContainer').classList.add('hidden');
        document.getElementById('videoContainer').classList.remove('hidden');

    } catch (error) {
        console.error('Playback failed:', error);
        showItemsList();
    }
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
           navigator.userAgent.includes('Mac OS') && navigator.maxTouchPoints > 1;
}

function handlePlayError(error) {
    console.log('Playback interaction needed');
    document.getElementById('playButton').classList.remove('hidden');
}

function showItemsList() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.removeAttribute('src'); // Clear src to abort pending requests
    videoPlayer.load(); // Reset internal state

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
        localStorage.setItem('jellyfinToken', token);

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
        localStorage.removeItem('jellyfinUserId');
        localStorage.removeItem('jellyfinToken');
        localStorage.removeItem('jellyfinServer');
        console.error('Login failed:', error);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check for complete set of stored credentials
        const storedServer = localStorage.getItem('jellyfinServer');
        const storedUsername = localStorage.getItem('jellyfinUsername');
        const storedUserId = localStorage.getItem('jellyfinUserId');
        const storedToken = localStorage.getItem('jellyfinToken');

        if (storedServer && storedUsername && storedUserId && storedToken) {
            // Attempt to use stored credentials
            AUTH_TOKEN = storedToken;
            JELLYFIN_SERVER = storedServer;

            try {
                // Verify credentials are still valid
                const data = await fetchLibraryItems();
                document.getElementById('loginContainer').classList.add('hidden');
                document.getElementById('itemsContainer').classList.remove('hidden');
                populateItems(data.Items || []);
                return;
            } catch (error) {
                console.log('Stored credentials expired, showing login form');
                localStorage.removeItem('jellyfinToken');
            }
        }

        // Show login form if any credentials are missing or invalid
        document.getElementById('loginContainer').classList.remove('hidden');
        if (storedServer && storedUsername) {
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
