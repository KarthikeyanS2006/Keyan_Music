// Keyan Music - THE COMPLETE, FULL-FEATURED & STABLE SERVER
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
    if (ytmusicInstance) return ytmusicInstance;
    try {
        console.log('Initializing YTMusic...');
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusicInstance = ytmusic;
        return ytmusicInstance;
    } catch (e) {
        console.error("Failed to initialize YTMusic:", e.message);
        ytmusicInstance = null;
        throw new Error("Could not connect to music service.");
    }
}
// Pre-initialize on startup
getYTMusic();

// --- API ROUTES ---

// Search for songs
app.get('/api/search', async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query) return res.status(400).json({ error: 'Search query is required.' });

        const ytmusic = await getYTMusic();
        const results = await ytmusic.search(query, 'song');
        
        const songs = results.map(song => ({
            videoId: song.videoId,
            title: song.name,
            artist: song.artist?.name || 'Unknown',
            thumbnail: song.thumbnails?.[0]?.url || '',
        }));
        res.json(songs);

    } catch (error) {
        res.status(500).json({ error: 'Search failed.', message: error.message });
    }
});

// Provide download instructions
app.get('/api/download/:videoId', (req, res) => {
    const { videoId } = req.params;
    res.json({
        success: false,
        message: 'To download this song:',
        instructions: [
            '1. The YouTube link has been copied to your clipboard!',
            '2. Go to a site like y2mate.com or yt1s.com',
            '3. Paste the link there to download the MP3.'
        ],
        youtubeUrl: `https://youtube.com/watch?v=${videoId}`
    });
});

// --- MAIN APPLICATION ---
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Keyan Music</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #FF6B35;
                --text: #2D3748;
                --text-light: #718096;
                --bg-light: #F8F9FA;
                --border-color: #E9ECEF;
            }
            body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                background-color: #FFF;
                color: var(--text);
                padding-bottom: 120px; /* Space for the fixed player */
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                background-color: #FFF;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                position: sticky;
                top: 0;
                z-index: 100;
            }
            .logo {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 1.5rem;
                font-weight: 700;
            }
            .logo .icon {
                background-color: var(--primary);
                color: white;
                width: 40px;
                height: 40px;
                display: grid;
                place-content: center;
                border-radius: 8px;
                font-weight: 600;
            }
            .user-info {
                font-weight: 500;
                background-color: var(--bg-light);
                padding: 0.5rem 1rem;
                border-radius: 99px;
            }
            .main-content {
                max-width: 800px;
                margin: 2rem auto;
                padding: 0 1rem;
            }
            .search-container {
                display: flex;
                margin-bottom: 2rem;
            }
            #searchInput {
                flex-grow: 1;
                padding: 0.8rem 1rem;
                font-size: 1rem;
                border: 1px solid var(--border-color);
                border-radius: 8px 0 0 8px;
                outline: none;
            }
            #searchInput:focus {
                border-color: var(--primary);
            }
            #searchBtn {
                background-color: var(--primary);
                color: white;
                border: none;
                padding: 0 1.5rem;
                border-radius: 0 8px 8px 0;
                cursor: pointer;
            }
            .songs-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            @media (min-width: 600px) {
                .songs-grid { grid-template-columns: 1fr 1fr; }
            }
            .song-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                background-color: var(--bg-light);
                border-radius: 12px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .song-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .song-card .thumbnail {
                width: 60px;
                height: 60px;
                border-radius: 8px;
                object-fit: cover;
            }
            .song-card .info {
                flex: 1;
                overflow: hidden;
            }
            .song-card .title {
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .song-card .artist {
                color: var(--text-light);
                font-size: 0.9rem;
            }
            .song-card .actions button {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
            }
            .player-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: white;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                padding: 1rem;
            }
            .player-content {
                max-width: 800px;
                margin: auto;
                display: grid;
                grid-template-columns: auto 1fr auto;
                align-items: center;
                gap: 1rem;
            }
            .player-controls { display: flex; justify-content: center; gap: 1rem; }
            .player-controls button { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
            .timeline-container { display: flex; align-items: center; gap: 0.5rem; }
            #progress-bar { width: 100%; height: 5px; background: var(--border-color); cursor: pointer; }
            #progress { height: 100%; width: 0%; background: var(--primary); }
            #time-info { font-size: 0.8rem; color: var(--text-light); }
            .notification {
                position: fixed; top: 1rem; right: 1rem; background-color: #333;
                color: white; padding: 1rem; border-radius: 8px; z-index: 1001;
            }
        </style>
    </head>
    <body>
        <header class="header">
            <div class="logo"><span class="icon">K</span> Keyan Music</div>
            <div class="user-info">Karthikeyan</div>
        </header>

        <main class="main-content">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search for your favorite song...">
                <button id="searchBtn"><i class="fas fa-search"></i></button>
            </div>
            <h2>Trending Music</h2>
            <div id="songsGrid" class="songs-grid"></div>
        </main>

        <footer class="player-bar">
            <div class="player-content">
                <div class="player-controls">
                    <button id="prevBtn"><i class="fas fa-step-backward"></i></button>
                    <button id="playBtn"><i class="fas fa-play"></i></button>
                    <button id="nextBtn"><i class="fas fa-step-forward"></i></button>
                </div>
                <div class="timeline-container">
                    <div id="time-info" class="current-time">0:00</div>
                    <div id="progress-bar"><div id="progress"></div></div>
                    <div id="time-info" class="total-time">0:00</div>
                </div>
            </div>
        </footer>

        <div id="notification-area"></div>

        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
            class KeyanMusicApp {
                constructor() {
                    this.playlist = [];
                    this.currentIndex = 0;
                    this.ytPlayer = null;
                    this.isReady = false;
                    this.progressInterval = null;

                    // Bind elements
                    this.elements = {
                        searchInput: document.getElementById('searchInput'),
                        searchBtn: document.getElementById('searchBtn'),
                        songsGrid: document.getElementById('songsGrid'),
                        playBtn: document.getElementById('playBtn'),
                        prevBtn: document.getElementById('prevBtn'),
                        nextBtn: document.getElementById('nextBtn'),
                        progressBar: document.getElementById('progress-bar'),
                        progress: document.getElementById('progress'),
                        currentTime: document.querySelector('.current-time'),
                        totalTime: document.querySelector('.total-time'),
                    };
                    
                    this.init();
                }

                init() {
                    this.loadInitialSongs();
                    this.bindEvents();
                    window.onYouTubeIframeAPIReady = () => this.setupYTPlayer();
                }
                
                bindEvents() {
                    this.elements.searchBtn.addEventListener('click', () => this.search());
                    this.elements.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') this.search(); });
                    this.elements.playBtn.addEventListener('click', () => this.togglePlay());
                    this.elements.prevBtn.addEventListener('click', () => this.playAdjacent(-1));
                    this.elements.nextBtn.addEventListener('click', () => this.playAdjacent(1));
                    this.elements.progressBar.addEventListener('click', e => this.seek(e));
                }

                setupYTPlayer() {
                    this.ytPlayer = new YT.Player(document.createElement('div'), {
                        height: '0', width: '0',
                        playerVars: { 'autoplay': 1 },
                        events: {
                            'onReady': () => { this.isReady = true; },
                            'onStateChange': e => {
                                if (e.data === YT.PlayerState.ENDED) this.playAdjacent(1);
                            }
                        }
                    });
                }
                
                async loadInitialSongs() {
                    await this.fetchAndDisplaySongs('top 10 trending songs');
                }
                
                async search() {
                    const query = this.elements.searchInput.value.trim();
                    if (!query) return;
                    await this.fetchAndDisplaySongs(query);
                }

                async fetchAndDisplaySongs(query) {
                    try {
                        this.elements.songsGrid.innerHTML = '<p>Loading...</p>';
                        const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                        const songs = await res.json();
                        this.playlist = songs;
                        this.displaySongs(songs);
                    } catch (e) {
                        this.elements.songsGrid.innerHTML = '<p>Failed to load songs.</p>';
                    }
                }

                displaySongs(songs) {
                    this.elements.songsGrid.innerHTML = songs.map((song, index) => \`
                        <div class="song-card" onclick="app.play(\${index})">
                            <img src="\${song.thumbnail}" class="thumbnail">
                            <div class="info">
                                <div class="title">\${song.title}</div>
                                <div class="artist">\${song.artist}</div>
                            </div>
                            <div class="actions">
                                <button onclick="event.stopPropagation(); app.download(\${index})"><i class="fas fa-download"></i></button>
                            </div>
                        </div>
                    \`).join('');
                }

                play(index) {
                    if (!this.isReady) return this.showNotification('Player not ready');
                    this.currentIndex = index;
                    const song = this.playlist[index];
                    this.ytPlayer.loadVideoById(song.videoId);
                    this.setPlayingState(true);
                    this.startProgressUpdater();
                }

                togglePlay() {
                    if (!this.ytPlayer || !this.playlist.length) return;
                    const state = this.ytPlayer.getPlayerState();
                    if (state === YT.PlayerState.PLAYING) {
                        this.ytPlayer.pauseVideo();
                        this.setPlayingState(false);
                    } else {
                        this.ytPlayer.playVideo();
                        this.setPlayingState(true);
                    }
                }
                
                setPlayingState(isPlaying) {
                    this.elements.playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                }

                playAdjacent(direction) {
                    const newIndex = (this.currentIndex + direction + this.playlist.length) % this.playlist.length;
                    this.play(newIndex);
                }

                startProgressUpdater() {
                    clearInterval(this.progressInterval);
                    this.progressInterval = setInterval(() => {
                        const currentTime = this.ytPlayer.getCurrentTime();
                        const duration = this.ytPlayer.getDuration();
                        if (duration > 0) {
                            this.elements.progress.style.width = \`\${(currentTime / duration) * 100}%\`;
                            this.elements.currentTime.textContent = this.formatTime(currentTime);
                            this.elements.totalTime.textContent = this.formatTime(duration);
                        }
                    }, 500);
                }

                seek(e) {
                    const duration = this.ytPlayer.getDuration();
                    if (duration > 0) {
                        const progressBar = this.elements.progressBar;
                        const newTime = (e.offsetX / progressBar.offsetWidth) * duration;
                        this.ytPlayer.seekTo(newTime);
                    }
                }

                async download(index) {
                    const song = this.playlist[index];
                    this.showNotification('Preparing download...', 'info');
                    const res = await fetch(\`/api/download/\${song.videoId}\`);
                    const data = await res.json();
                    navigator.clipboard.writeText(data.youtubeUrl)
                        .then(() => {
                            alert(data.instructions.join('\\n'));
                            this.showNotification('Link copied!', 'success');
                        });
                }

                formatTime(seconds) {
                    const min = Math.floor(seconds / 60);
                    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
                    return \`\${min}:\${sec}\`;
                }

                showNotification(message, type = 'info') {
                    const area = document.getElementById('notification-area');
                    const div = document.createElement('div');
                    div.className = \`notification \${type}\`;
                    div.textContent = message;
                    area.appendChild(div);
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
        console.log(`Server running at http://localhost:${port}`);
    });
}
