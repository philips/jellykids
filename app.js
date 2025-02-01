const API_TOKEN = 'YOUR_API_TOKEN_HERE'; // Replace with your Jellyfin API token
const JELLYFIN_SERVER = 'http://your-jellyfin-server:8096';

async function fetchLibraryItems() {
    try {
        const response = await fetch(`${JELLYFIN_SERVER}/Items`, {
            headers: {
                'X-Emby-Token': API_TOKEN,
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await fetchLibraryItems();
        populateItems(data.Items || []);
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
