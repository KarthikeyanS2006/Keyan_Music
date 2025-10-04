// Keyan Music - FINAL, STABLE & CORRECTED SERVER
import express from 'express';
import cors from 'cors';
import YTMusic from 'ytmusic-api';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// A more robust way to handle the YTMusic instance
let ytmusicInstance;
async function getYTMusic() {
    if (ytmusicInstance) {
        return ytmusicInstance;
    }
    try {
        console.log('Initializing YTMusic for the first time...');
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusicInstance = ytmusic;
        console.log('YTMusic Initialized Successfully.');
        return ytmusicInstance;
    } catch (e) {
        console.error("CRITICAL: Failed to initialize YTMusic API ->", e.message);
        // Set instance to null so it can be retried on a later request
        ytmusicInstance = null; 
        throw new Error("Could not connect to music service.");
    }
}

// Immediately try to initialize the API on startup.
getYTMusic();

// --- API Routes ---

// Search Route
app.get('/api/search', async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'A search query is required.' });
        }

        const ytmusic = await getYTMusic();
        const results = await ytmusic.search(query, 'song');
        
        const songs = results.map(song => ({
            videoId: song.videoId,
            title: song.name,
            artist: song.artist?.name || 'Unknown Artist',
            thumbnail: song.thumbnails?.[0]?.url || '',
            duration: song.duration || '0:00'
        }));

        res.json(songs);

    } catch (error) {
        console.error('Search Route Error:', error.message);
        res.status(500).json({ error: 'Search failed.', message: error.message });
    }
});

// Download Route (Instructional Method)
app.get('/api/download/:videoId', (req, res) => {
    const { videoId } = req.params;
    res.json({
        success: false, // Important for the frontend logic
        message: 'To download this song:',
        instructions: [
            '1. The YouTube link has been copied to your clipboard!',
            '2. Go to a website like y2mate.com or yt1s.com',
            '3. Paste the link there to download the MP3.'
        ],
        youtubeUrl: `https://youtube.com/watch?v=${videoId}`
    });
});

// --- Main Application ---
app.get('/', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Keyan Music</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                :root { --primary: #FF6B35; --text: #2D3748; --gray: #E9ECEF; }
                body { font-family: sans-serif; margin: 0; padding-bottom: 100px; }
                .header { padding: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .main { max-width: 800px; margin: auto; padding: 1rem; }
                .search-box { display: flex; margin-top: 1rem; }
                .search-input { flex: 1; padding: 0.8rem; border: 1px solid var(--gray); border-radius: 8px 0 0 8px; }
                .search-btn { padding: 0.8rem; background: var(--primary); color: white; border: none; border-radius: 0 8px 8px 0; cursor: pointer; }
                .song-item { display: flex; align-items: center; gap: 1rem; padding: 0.8rem; border-bottom: 1px solid var(--gray); }
                .song-thumbnail { width: 50px; height: 50px; border-radius: 4px; }
                .song-info { flex: 1; }
                .download-btn { background: #28a745; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; }
                .player { position: fixed; bottom: 0; width: 100%; background: white; padding: 1rem; border-top: 1px solid var(--gray); display: flex; align-items: center; justify-content: center; gap: 1rem; }
                .notification { position: fixed; top: 1rem; right: 1rem; background: #333; color: white; padding: 1rem; border-radius: 8px; }
            </style>
        </head>
        <body>
            <header class="header"><h1>Keyan Music</h1></header>
            <main class="main">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Search for a song...">
                    <button id="searchBtn"><i class="fas fa-search"></i></button>
                </div>
                <div id="songsList"></div>
            </main>
            <div class="player">
                <button id="prevBtn"><i class="fas fa-step-backward"></i></button>
                <button id="playBtn"><i class="fas fa-play"></i></button>
                <button id="nextBtn"><i class="fas fa-step-forward"></i></button>
            </div>
            <div id="notification-area"></div>

            <script>
                class KeyanMusicApp {
                    constructor() {
                        this.currentPlaylist = [];
                        this.currentIndex = 0;
                        this.isPlaying = false;
                        this.activePlayer = null;

                        this.searchInput = document.getElementById('searchInput');
                        this.searchBtn = document.getElementById('searchBtn');
                        this.songsList = document.getElementById('songsList');
                        this.playBtn = document.getElementById('playBtn');
                        this.prevBtn = document.getElementById('prevBtn');
                        this.nextBtn = document.getElementById('nextBtn');

                        this.bindEvents();
                    }

                    bindEvents() {
                        this.searchBtn.addEventListener('click', () => this.search());
                        this.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') this.search(); });
                        this.playBtn.addEventListener('click', () => this.togglePlay());
                        this.prevBtn.addEventListener('click', () => this.playAdjacent(-1));
                        this.nextBtn.addEventListener('click', () => this.playAdjacent(1));
                    }

                    async search() {
                        const query = this.searchInput.value.trim();
                        if (!query) return;
                        this.songsList.innerHTML = '<p>Searching...</p>';
                        try {
                            const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                            const songs = await res.json();
                            this.currentPlaylist = songs;
                            this.displaySongs(songs);
                        } catch (e) {
                            this.songsList.innerHTML = '<p>Search failed. Please try again.</p>';
                        }
                    }

                    displaySongs(songs) {
                        this.songsList.innerHTML = songs.map((song, index) => \`
                            <div class="song-item">
                                <img src="\${song.thumbnail}" class="song-thumbnail">
                                <div class="song-info">
                                    <div>\${song.title}</div>
                                    <small>\${song.artist}</small>
                                </div>
                                <button class="download-btn" onclick="app.download(\${index})"><i class="fas fa-download"></i></button>
                                <button onclick="app.play(\${index})"><i class="fas fa-play"></i></button>
                            </div>
                        \`).join('');
                    }

                    play(index) {
                        if (this.activePlayer) {
                            this.activePlayer.remove();
                        }
                        this.currentIndex = index;
                        const song = this.currentPlaylist[index];
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = \`https://www.youtube.com/embed/\${song.videoId}?autoplay=1\`;
                        document.body.appendChild(iframe);
                        this.activePlayer = iframe;
                        this.setPlayingState(true);
                    }

                    togglePlay() {
                        if (this.activePlayer) {
                            this.activePlayer.remove();
                            this.activePlayer = null;
                            this.setPlayingState(false);
                        } else if (this.currentPlaylist.length > 0) {
                            this.play(this.currentIndex);
                        }
                    }
                    
                    setPlayingState(playing) {
                        this.isPlaying = playing;
                        this.playBtn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                    }

                    playAdjacent(direction) {
                        const newIndex = (this.currentIndex + direction + this.currentPlaylist.length) % this.currentPlaylist.length;
                        this.play(newIndex);
                    }

                    async download(index) {
                        const song = this.currentPlaylist[index];
                        this.showNotification('Preparing download...', 'info');
                        const res = await fetch(\`/api/download/\${song.videoId}\`);
                        const data = await res.json();
                        navigator.clipboard.writeText(data.youtubeUrl)
                            .then(() => {
                                alert(data.instructions.join('\\n'));
                                this.showNotification('Link copied!', 'success');
                            });
                    }

                    showNotification(message, type) {
                        const div = document.createElement('div');
                        div.className = \`notification \${type}\`;
                        div.textContent = message;
                        document.getElementById('notification-area').appendChild(div);
                        setTimeout(() => div.remove(), 3000);
                    }
                }
                const app = new KeyanMusicApp();
            </script>
        </body>
        </html>
    `;
    res.send(html);
});

// Export for Vercel
export default app;

// Local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running locally at http://localhost:${port}`);
    });
}
