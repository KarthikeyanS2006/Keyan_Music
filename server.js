// Keyan Music - Complete Clean & Simple Server (FIXED)
import express from 'express';
import cors from 'cors';
import YTMusic from 'ytmusic-api';
import path from 'path';
import { fileURLToPath } from 'url';
import ytdl from 'ytdl-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize YTMusic
let ytmusic = null;
let isInitialized = false;
let initPromise = null;

async function initializeYTMusic() {
    if (isInitialized) return ytmusic;
    
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            console.log('🎵 Initializing YTMusic API...');
            ytmusic = new YTMusic();
            await ytmusic.initialize();
            isInitialized = true;
            console.log('✅ YTMusic API initialized successfully');
            return ytmusic;
        } catch (error) {
            console.error('❌ YTMusic initialization failed:', error);
            isInitialized = false;
            ytmusic = null;
            initPromise = null;
            throw error;
        }
    })();
    
    return initPromise;
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Keyan Music API is running',
        initialized: isInitialized,
        timestamp: new Date().toISOString()
    });
});

// Search API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        console.log(`🔍 API Search: "${query}"`);
        
        const ytm = await initializeYTMusic();
        const results = await ytm.search(query);
        
        const songs = results.filter(item => 
            item.type === 'SONG' || item.type === 'VIDEO'
        ).slice(0, limit).map(song => ({
            id: song.videoId,
            title: song.name || song.title,
            artist: song.artist?.name || 'Unknown',
            duration: song.duration || 'Unknown',
            thumbnail: song.thumbnails?.[0]?.url || '',
            videoId: song.videoId,
            type: song.type
        }));
        
        console.log(`📚 Found ${songs.length} songs`);
        res.json(songs);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message
        });
    }
});

// Download route
app.get('/api/download/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const videoURL = `https://youtube.com/watch?v=${videoId}`;
        
        console.log(`📥 Download request for: ${videoId}`);
        
        if (!ytdl.validateURL(videoURL)) {
            console.error('❌ Invalid video URL:', videoURL);
            return res.status(400).json({ error: 'Invalid video URL' });
        }
        
        const info = await ytdl.getInfo(videoURL);
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50);
        
        console.log(`📥 Starting download: ${title}`);
        
        const audioStream = ytdl(videoURL, { 
            quality: 'highestaudio',
            filter: 'audioonly'
        });
        
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${title}.mp3"`,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        
        audioStream.pipe(res);
        
        audioStream.on('error', (error) => {
            console.error('❌ Download stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });
        
        audioStream.on('end', () => {
            console.log(`✅ Download completed: ${title}`);
        });
        
    } catch (error) {
        console.error('❌ Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed: ' + error.message });
        }
    }
});

// Serve main app
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Keyan Music - Stream Your World</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <meta name="theme-color" content="#FF6B35">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23FF6B35'/><text x='50' y='60' text-anchor='middle' fill='white' font-size='40' font-family='Arial'>K</text></svg>">
    
    <style>
        /* Clean & Simple Keyan Music Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-orange: #FF6B35;
            --light-orange: #FFB5A0;
            --dark-orange: #E55A2B;
            --white: #FFFFFF;
            --light-gray: #F8F9FA;
            --medium-gray: #E9ECEF;
            --text-dark: #2D3748;
            --text-medium: #4A5568;
            --text-light: #718096;
            --shadow-light: 0 2px 4px rgba(0,0,0,0.1);
            --shadow-medium: 0 4px 12px rgba(0,0,0,0.15);
            --radius: 12px;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        body {
            font-family: var(--font-family);
            background: var(--white);
            color: var(--text-dark);
            line-height: 1.6;
            font-weight: 400;
        }

        .header {
            background: var(--white);
            box-shadow: var(--shadow-light);
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: var(--primary-orange);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            font-weight: 600;
        }

        .logo h1 {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-dark);
        }

        .tagline {
            font-size: 12px;
            color: var(--text-light);
            font-weight: 500;
        }

        .nav {
            display: flex;
            gap: 0.5rem;
        }

        .nav-item {
            padding: 0.5rem 1rem;
            text-decoration: none;
            color: var(--text-medium);
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .nav-item:hover,
        .nav-item.active {
            background: var(--light-gray);
            color: var(--primary-orange);
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--light-gray);
            border-radius: 20px;
            font-weight: 500;
            color: var(--text-dark);
        }

        .user-avatar {
            width: 28px;
            height: 28px;
            background: var(--primary-orange);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
        }

        .main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .hero {
            text-align: center;
            padding: 3rem 0;
        }

        .hero h2 {
            font-size: clamp(2rem, 5vw, 3rem);
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 1rem;
        }

        .hero p {
            font-size: 18px;
            color: var(--text-medium);
            margin-bottom: 2rem;
        }

        .search-container {
            max-width: 600px;
            margin: 0 auto 3rem;
        }

        .search-box {
            display: flex;
            background: var(--white);
            border: 2px solid var(--medium-gray);
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow-light);
            transition: all 0.2s ease;
        }

        .search-box:focus-within {
            border-color: var(--primary-orange);
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .search-input {
            flex: 1;
            padding: 1rem 1.5rem;
            border: none;
            outline: none;
            font-size: 16px;
            font-family: var(--font-family);
        }

        .search-input::placeholder {
            color: var(--text-light);
        }

        .search-btn {
            background: var(--primary-orange);
            color: white;
            border: none;
            padding: 1rem 1.5rem;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        .search-btn:hover {
            background: var(--dark-orange);
        }

        .loading {
            text-align: center;
            padding: 3rem;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--medium-gray);
            border-top: 3px solid var(--primary-orange);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .results-section {
            margin-top: 2rem;
        }

        .results-header {
            margin-bottom: 1.5rem;
        }

        .results-header h3 {
            font-size: 24px;
            font-weight: 600;
            color: var(--text-dark);
        }

        .songs-list {
            display: grid;
            gap: 1rem;
        }

        .song-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--white);
            border: 1px solid var(--medium-gray);
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .song-item:hover {
            border-color: var(--primary-orange);
            box-shadow: var(--shadow-medium);
            transform: translateY(-2px);
        }

        .song-thumbnail {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            background: var(--light-gray);
        }

        .song-info {
            flex: 1;
            min-width: 0;
        }

        .song-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 0.25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .song-artist {
            font-size: 14px;
            color: var(--text-medium);
        }

        .song-duration {
            font-size: 14px;
            color: var(--text-light);
            margin-right: 1rem;
        }

        .download-btn {
            width: 40px;
            height: 40px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s ease;
            margin-right: 10px;
        }

        .download-btn:hover {
            background: #218838;
            transform: scale(1.05);
        }

        .download-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        }

        .download-notification.info { background: #17a2b8; }
        .download-notification.success { background: #28a745; }
        .download-notification.error { background: #dc3545; }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .play-btn {
            width: 48px;
            height: 48px;
            background: var(--primary-orange);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.2s ease;
        }

        .play-btn:hover {
            background: var(--dark-orange);
            transform: scale(1.05);
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
            margin: 4rem 0;
        }

        .feature-card {
            text-align: center;
            padding: 2rem;
            background: var(--light-gray);
            border-radius: var(--radius);
        }

        .feature-icon {
            width: 60px;
            height: 60px;
            background: var(--primary-orange);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 1rem;
        }

        .feature-card h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-dark);
        }

        .feature-card p {
            color: var(--text-medium);
            font-size: 14px;
        }

        .player {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--white);
            border-top: 1px solid var(--medium-gray);
            padding: 1rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .player-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
            min-width: 0;
        }

        .player-thumbnail {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            object-fit: cover;
            background: var(--light-gray);
        }

        .player-details {
            flex: 1;
            min-width: 0;
        }

        .player-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 0.25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .player-artist {
            font-size: 12px;
            color: var(--text-medium);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .player-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .control-btn {
            width: 40px;
            height: 40px;
            background: transparent;
            border: 1px solid var(--medium-gray);
            border-radius: 50%;
            color: var(--text-medium);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .control-btn:hover {
            border-color: var(--primary-orange);
            color: var(--primary-orange);
        }

        .control-btn.primary {
            background: var(--primary-orange);
            color: white;
            border-color: var(--primary-orange);
            width: 48px;
            height: 48px;
        }

        .control-btn.primary:hover {
            background: var(--dark-orange);
        }

        .player-extras {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
            justify-content: flex-end;
        }

        .volume-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .volume-slider {
            width: 80px;
            accent-color: var(--primary-orange);
        }

        .hidden {
            display: none !important;
        }

        @media (max-width: 768px) {
            .header-content {
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .nav {
                order: 3;
                width: 100%;
                justify-content: center;
            }
            
            .main {
                padding: 1rem;
                padding-bottom: 100px;
            }
            
            .player {
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .player-extras {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div id="app">
        <header class="header">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-icon">K</div>
                    <div>
                        <h1>Keyan Music</h1>
                        <div class="tagline">Stream Your World</div>
                    </div>
                </div>
                <nav class="nav">
                    <a href="#" class="nav-item active">Home</a>
                    <a href="#" class="nav-item">Browse</a>
                    <a href="#" class="nav-item">Library</a>
                    <a href="#" class="nav-item">Playlists</a>
                </nav>
                <div class="user-info">
                    <div class="user-avatar">K</div>
                    <span>Karthikeyan</span>
                </div>
            </div>
        </header>

        <main class="main">
            <section class="hero">
                <h2>Discover Your Next Favorite Song</h2>
                <p>Millions of tracks at your fingertips</p>
                
                <div class="search-container">
                    <div class="search-box">
                        <input type="text" id="searchInput" class="search-input" placeholder="Search for songs, artists, albums...">
                        <button id="searchBtn" class="search-btn">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </section>

            <div id="loading" class="loading hidden">
                <div class="spinner"></div>
                <p>Finding your music...</p>
            </div>

            <section id="resultsSection" class="results-section hidden">
                <div class="results-header">
                    <h3>Search Results</h3>
                </div>
                <div id="songsList" class="songs-list"></div>
            </section>

            <section id="featuresSection" class="features">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-infinity"></i>
                    </div>
                    <h3>Unlimited Streaming</h3>
                    <p>Access millions of songs from YouTube Music</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <h3>Download Music</h3>
                    <p>Download your favorite songs as MP3 files</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h3>Cross-Platform</h3>
                    <p>Sync across all your devices</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-crown"></i>
                    </div>
                    <h3>Premium Quality</h3>
                    <p>High-definition audio streaming</p>
                </div>
            </section>
        </main>

        <div class="player" id="player">
            <div class="player-info">
                <img id="playerThumbnail" src="" alt="" class="player-thumbnail">
                <div class="player-details">
                    <div id="playerTitle" class="player-title">Select a song to play</div>
                    <div id="playerArtist" class="player-artist">Choose from millions of tracks</div>
                </div>
            </div>

            <div class="player-controls">
                <button id="prevBtn" class="control-btn">
                    <i class="fas fa-step-backward"></i>
                </button>
                <button id="playBtn" class="control-btn primary">
                    <i class="fas fa-play"></i>
                </button>
                <button id="nextBtn" class="control-btn">
                    <i class="fas fa-step-forward"></i>
                </button>
            </div>

            <div class="player-extras">
                <div class="volume-control">
                    <i class="fas fa-volume-up"></i>
                    <input type="range" id="volumeSlider" min="0" max="100" value="50" class="volume-slider">
                </div>
            </div>
        </div>
    </div>

    <div id="youtube-player-container" style="position: absolute; left: -9999px; width: 1px; height: 1px;">
        <div id="youtube-player"></div>
    </div>

    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
        class KeyanMusicApp {
            constructor() {
                this.currentPlaylist = [];
                this.currentIndex = 0;
                this.isPlaying = false;
                this.currentSong = null;
                this.youtubePlayer = null;
                this.isPlayerReady = false;
                
                this.initializeElements();
                this.bindEvents();
                this.initializeYouTubePlayer();
            }
            
            initializeElements() {
                this.searchInput = document.getElementById('searchInput');
                this.searchBtn = document.getElementById('searchBtn');
                this.loading = document.getElementById('loading');
                this.resultsSection = document.getElementById('resultsSection');
                this.featuresSection = document.getElementById('featuresSection');
                this.songsList = document.getElementById('songsList');
                this.playerThumbnail = document.getElementById('playerThumbnail');
                this.playerTitle = document.getElementById('playerTitle');
                this.playerArtist = document.getElementById('playerArtist');
                this.playBtn = document.getElementById('playBtn');
                this.prevBtn = document.getElementById('prevBtn');
                this.nextBtn = document.getElementById('nextBtn');
                this.volumeSlider = document.getElementById('volumeSlider');
            }
            
            initializeYouTubePlayer() {
                window.onYouTubeIframeAPIReady = () => {
                    this.youtubePlayer = new YT.Player('youtube-player', {
                        height: '1',
                        width: '1',
                        playerVars: {
                            'playsinline': 1,
                            'controls': 0,
                            'modestbranding': 1,
                            'rel': 0
                        },
                        events: {
                            'onReady': () => {
                                this.isPlayerReady = true;
                                this.youtubePlayer.setVolume(50);
                                console.log('✅ YouTube Player Ready');
                            },
                            'onStateChange': (event) => this.onPlayerStateChange(event),
                            'onError': (error) => {
                                console.error('❌ YouTube Player Error:', error);
                                this.nextSong();
                            }
                        }
                    });
                };
            }
            
            onPlayerStateChange(event) {
                if (event.data === YT.PlayerState.PLAYING) {
                    this.setPlayingState(true);
                } else if (event.data === YT.PlayerState.PAUSED) {
                    this.setPlayingState(false);
                } else if (event.data === YT.PlayerState.ENDED) {
                    this.nextSong();
                }
            }
            
            bindEvents() {
                this.searchBtn.addEventListener('click', () => this.performSearch());
                this.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.performSearch();
                });
                
                this.playBtn.addEventListener('click', () => this.togglePlay());
                this.prevBtn.addEventListener('click', () => this.previousSong());
                this.nextBtn.addEventListener('click', () => this.nextSong());
                
                this.volumeSlider.addEventListener('input', (e) => {
                    if (this.isPlayerReady && this.youtubePlayer) {
                        this.youtubePlayer.setVolume(e.target.value);
                    }
                });
            }
            
            async performSearch() {
                const query = this.searchInput.value.trim();
                if (!query) return;
                
                this.showLoading();
                
                try {
                    console.log('🔍 Searching for:', query);
                    const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}&limit=20\`);
                    
                    if (!response.ok) {
                        throw new Error(\`Search failed: \${response.status}\`);
                    }
                    
                    const songs = await response.json();
                    
                    if (songs.error) {
                        throw new Error(songs.message || songs.error);
                    }
                    
                    console.log('✅ Search results:', songs.length, 'songs');
                    this.displayResults(songs);
                } catch (error) {
                    console.error('❌ Search error:', error);
                    this.showDownloadStatus('Search failed: ' + error.message, 'error');
                } finally {
                    this.hideLoading();
                }
            }
            
            displayResults(songs) {
                this.currentPlaylist = songs;
                this.hideAllSections();
                this.resultsSection.classList.remove('hidden');
                
                this.songsList.innerHTML = '';
                
                songs.forEach((song, index) => {
                    const songElement = this.createSongElement(song, index);
                    this.songsList.appendChild(songElement);
                });
            }
            
            createSongElement(song, index) {
                const songDiv = document.createElement('div');
                songDiv.className = 'song-item';
                songDiv.addEventListener('click', () => this.playSong(index));
                
                songDiv.innerHTML = \`
                    <img src="\${song.thumbnail || ''}" alt="\${song.title}" class="song-thumbnail" 
                         onerror="this.style.background='#FF6B35'; this.src='';">
                    <div class="song-info">
                        <div class="song-title">\${this.truncateText(song.title, 50)}</div>
                        <div class="song-artist">\${song.artist}</div>
                    </div>
                    <div class="song-duration">\${this.formatDuration(song.duration)}</div>
                    
                    <button class="download-btn" onclick="event.stopPropagation(); app.downloadSong(\${index})" title="Download MP3">
                        <i class="fas fa-download"></i>
                    </button>
                    
                    <button class="play-btn" onclick="event.stopPropagation(); app.playSong(\${index})">
                        <i class="fas fa-play"></i>
                    </button>
                \`;
                
                return songDiv;
            }
            
            async downloadSong(index) {
                const song = this.currentPlaylist[index];
                if (!song || !song.videoId) return;
                
                try {
                    this.showDownloadStatus('Starting download...', 'info');
                    
                    const downloadUrl = \`/api/download/\${song.videoId}\`;
                    
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = \`\${song.title} - \${song.artist}.mp3\`;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.showDownloadStatus('Download started successfully!', 'success');
                    
                } catch (error) {
                    console.error('❌ Download failed:', error);
                    this.showDownloadStatus('Download failed. Please try again.', 'error');
                }
            }
            
            showDownloadStatus(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = \`download-notification \${type}\`;
                notification.innerHTML = \`
                    <div class="notification-content">
                        <i class="fas fa-\${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                        <span>\${message}</span>
                    </div>
                \`;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 4000);
            }
            
            async playSong(index) {
                if (!this.isPlayerReady) {
                    console.log('⏳ Player not ready yet');
                    return;
                }
                
                this.currentIndex = index;
                this.currentSong = this.currentPlaylist[index];
                
                try {
                    console.log('🎵 Playing:', this.currentSong.title);
                    this.youtubePlayer.loadVideoById(this.currentSong.videoId);
                    this.updatePlayerDisplay();
                    
                    setTimeout(() => {
                        if (this.youtubePlayer && this.youtubePlayer.playVideo) {
                            this.youtubePlayer.playVideo();
                        }
                    }, 1000);
                } catch (error) {
                    console.error('❌ Play error:', error);
                    this.nextSong();
                }
            }
            
            updatePlayerDisplay() {
                if (!this.currentSong) return;
                
                this.playerTitle.textContent = this.currentSong.title;
                this.playerArtist.textContent = this.currentSong.artist;
                
                if (this.currentSong.thumbnail) {
                    this.playerThumbnail.src = this.currentSong.thumbnail;
                }
            }
            
            togglePlay() {
                if (!this.isPlayerReady) return;
                
                if (!this.currentSong) {
                    if (this.currentPlaylist.length > 0) {
                        this.playSong(0);
                    }
                    return;
                }
                
                if (this.isPlaying) {
                    this.youtubePlayer.pauseVideo();
                } else {
                    this.youtubePlayer.playVideo();
                }
            }
            
            setPlayingState(playing) {
                this.isPlaying = playing;
                const playIcon = this.playBtn.querySelector('i');
                
                if (playing) {
                    playIcon.className = 'fas fa-pause';
                } else {
                    playIcon.className = 'fas fa-play';
                }
            }
            
            nextSong() {
                if (this.currentPlaylist.length === 0) return;
                
                const nextIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
                this.playSong(nextIndex);
            }
            
            previousSong() {
                if (this.currentPlaylist.length === 0) return;
                
                const prevIndex = this.currentIndex === 0 ? 
                    this.currentPlaylist.length - 1 : 
                    this.currentIndex - 1;
                this.playSong(prevIndex);
            }
            
            showLoading() {
                this.hideAllSections();
                this.loading.classList.remove('hidden');
            }
            
            hideLoading() {
                this.loading.classList.add('hidden');
            }
            
            hideAllSections() {
                this.loading.classList.add('hidden');
                this.resultsSection.classList.add('hidden');
                this.featuresSection.classList.remove('hidden');
            }
            
            truncateText(text, maxLength) {
                if (!text) return 'Unknown';
                return text.length > maxLength ? 
                    text.substring(0, maxLength) + '...' : 
                    text;
            }
            
            formatDuration(duration) {
                if (!duration || duration === 'Unknown') return 'Unknown';
                if (typeof duration === 'string') return duration;
                
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                return \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
            }
        }

        window.app = new KeyanMusicApp();
        console.log('🎵 Keyan Music App Initialized');

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                app.togglePlay();
            }
        });
    </script>
</body>
</html>`);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize YTMusic on startup
setTimeout(() => {
    initializeYTMusic().catch(err => {
        console.error('❌ Background initialization failed:', err);
    });
}, 1000);

// Export for Vercel
export default app;

// Local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🎵 Keyan Music server running at http://localhost:${port}`);
    });
}
