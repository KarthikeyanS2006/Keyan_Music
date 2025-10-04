// Keyan Music - WORKING Server with REAL Music Play & Downloads
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

// Search API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        console.log('🔍 API Search:', query);
        
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
        
        console.log('📚 Found', songs.length, 'songs');
        res.json(songs);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message
        });
    }
});

// Improved Download API
//
// NEAT & LEGIBLE DIRECT DOWNLOAD ROUTE
// Attempts to stream a YouTube video as an MP3 file.
// NOTE: This will still be unreliable on Vercel due to platform limitations.
//
app.get('/api/download/:videoId', async (req, res) => {
    try {
        // --- 1. Get and Validate the Video ID ---
        const { videoId } = req.params;
        const videoURL = `https://youtube.com/watch?v=${videoId}`;

        if (!ytdl.validateURL(videoURL)) {
            console.error('Invalid URL:', videoURL);
            return res.status(400).json({ error: 'Invalid YouTube URL provided.' });
        }

        console.log(`Starting download process for: ${videoId}`);

        // --- 2. Fetch Video Information ---
        const info = await ytdl.getInfo(videoURL, {
            requestOptions: {
                // Use a standard browser User-Agent to avoid being blocked
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            },
        });

        // --- 3. Sanitize the Filename ---
        // Remove special characters that are invalid in filenames
        const title = info.videoDetails.title.replace(/[\\/:"*?<>|]/g, '').trim();
        const safeTitle = title.substring(0, 50) || 'audio'; // Limit length

        console.log(`Sanitized Title: ${safeTitle}`);

        // --- 4. Set Headers for File Download ---
        // These headers tell the browser to treat the response as a downloadable file.
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // --- 5. Create and Pipe the Audio Stream ---
        const audioStream = ytdl(videoURL, {
            quality: 'highestaudio', // Get the best audio quality
            filter: 'audioonly',     // Only get the audio, not video
            highWaterMark: 1 << 25,  // Increase buffer size to 32MB to help with Vercel's speed
        });

        // Connect the YouTube audio stream directly to the user's response
        audioStream.pipe(res);

        // --- 6. Handle Events ---
        audioStream.on('error', (err) => {
            console.error('** STREAM ERROR **:', err.message);
            // Don't try to send a response if one has already been sent
            if (!res.headersSent) {
                res.status(500).json({ error: 'A stream error occurred.' });
            }
        });

        audioStream.on('end', () => {
            console.log('Stream finished successfully.');
        });

    } catch (error) {
        // --- 7. Catch All Other Errors ---
        console.error('** DOWNLOAD ROUTE ERROR **:', error.message);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'The download could not be started.',
                message: 'This video may be private, age-restricted, or otherwise unavailable from our server location.'
            });
        }
    }
});

// Serve main app
app.get('/', (req, res) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Keyan Music - Stream Your World</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #FF6B35;
            --light: #FFB5A0;
            --dark: #E55A2B;
            --white: #FFFFFF;
            --gray-light: #F8F9FA;
            --gray: #E9ECEF;
            --text: #2D3748;
            --text-light: #718096;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: var(--white);
            color: var(--text);
            padding-bottom: 100px;
        }
        
        .header {
            background: var(--white);
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
            gap: 1rem;
        }
        
        .logo-icon {
            width: 40px;
            height: 40px;
            background: var(--primary);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        
        .logo h1 {
            font-size: 24px;
            font-weight: 700;
        }
        
        .user-info {
            background: var(--gray-light);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: 500;
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
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }
        
        .hero p {
            font-size: 18px;
            color: var(--text-light);
            margin-bottom: 2rem;
        }
        
        .search-container {
            max-width: 600px;
            margin: 0 auto 3rem;
        }
        
        .search-box {
            display: flex;
            border: 2px solid var(--gray);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .search-box:focus-within {
            border-color: var(--primary);
        }
        
        .search-input {
            flex: 1;
            padding: 1rem 1.5rem;
            border: none;
            outline: none;
            font-size: 16px;
        }
        
        .search-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 1rem 1.5rem;
            cursor: pointer;
            font-size: 16px;
        }
        
        .search-btn:hover {
            background: var(--dark);
        }
        
        .loading {
            text-align: center;
            padding: 3rem;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--gray);
            border-top: 3px solid var(--primary);
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
        
        .results-header h3 {
            font-size: 24px;
            margin-bottom: 1.5rem;
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
            border: 1px solid var(--gray);
            border-radius: 12px;
            transition: all 0.2s ease;
        }
        
        .song-item:hover {
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        
        .song-thumbnail {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            background: var(--gray-light);
        }
        
        .song-info {
            flex: 1;
            min-width: 0;
        }
        
        .song-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 0.25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .song-artist {
            font-size: 14px;
            color: var(--text-light);
        }
        
        .song-duration {
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
            margin-right: 10px;
            transition: all 0.2s ease;
        }
        
        .download-btn:hover {
            background: #218838;
            transform: scale(1.1);
        }
        
        .play-btn {
            width: 48px;
            height: 48px;
            background: var(--primary);
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
            background: var(--dark);
            transform: scale(1.05);
        }
        
        .player {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--white);
            border-top: 1px solid var(--gray);
            padding: 1rem 2rem;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .player-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 2rem;
        }
        
        .player-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
        }
        
        .player-thumbnail {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            background: var(--gray-light);
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
            color: var(--text-light);
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
            border: 1px solid var(--gray);
            border-radius: 50%;
            color: var(--text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .control-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
        }
        
        .control-btn.primary {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            width: 48px;
            height: 48px;
        }
        
        .control-btn.primary:hover {
            background: var(--dark);
        }
        
        .hidden {
            display: none !important;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        }
        
        .notification.success { background: #28a745; }
        .notification.error { background: #dc3545; }
        .notification.info { background: #17a2b8; }
        
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">
                <div class="logo-icon">K</div>
                <h1>Keyan Music</h1>
            </div>
            <div class="user-info">Karthikeyan</div>
        </div>
    </div>

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
    </main>

    <div class="player">
        <div class="player-content">
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
        </div>
    </div>

    <audio id="audioPlayer" preload="none"></audio>

    <script>
        class KeyanMusicApp {
            constructor() {
                this.currentPlaylist = [];
                this.currentIndex = 0;
                this.isPlaying = false;
                this.currentSong = null;
                this.audioPlayer = null;
                
                this.initializeElements();
                this.bindEvents();
            }
            
            initializeElements() {
                this.searchInput = document.getElementById('searchInput');
                this.searchBtn = document.getElementById('searchBtn');
                this.loading = document.getElementById('loading');
                this.resultsSection = document.getElementById('resultsSection');
                this.songsList = document.getElementById('songsList');
                this.playerThumbnail = document.getElementById('playerThumbnail');
                this.playerTitle = document.getElementById('playerTitle');
                this.playerArtist = document.getElementById('playerArtist');
                this.playBtn = document.getElementById('playBtn');
                this.prevBtn = document.getElementById('prevBtn');
                this.nextBtn = document.getElementById('nextBtn');
                this.audioPlayer = document.getElementById('audioPlayer');
                
                // Audio events
                this.audioPlayer.addEventListener('ended', () => this.nextSong());
                this.audioPlayer.addEventListener('play', () => this.setPlayingState(true));
                this.audioPlayer.addEventListener('pause', () => this.setPlayingState(false));
            }
            
            bindEvents() {
                this.searchBtn.addEventListener('click', () => this.performSearch());
                this.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.performSearch();
                });
                
                this.playBtn.addEventListener('click', () => this.togglePlay());
                this.prevBtn.addEventListener('click', () => this.previousSong());
                this.nextBtn.addEventListener('click', () => this.nextSong());
            }
            
            async performSearch() {
                const query = this.searchInput.value.trim();
                if (!query) return;
                
                this.showLoading();
                
                try {
                    const response = await fetch('/api/search?q=' + encodeURIComponent(query));
                    const songs = await response.json();
                    
                    if (songs.error) {
                        throw new Error(songs.error);
                    }
                    
                    this.displayResults(songs);
                } catch (error) {
                    console.error('Search error:', error);
                    this.showNotification('Search failed: ' + error.message, 'error');
                } finally {
                    this.hideLoading();
                }
            }
            
            displayResults(songs) {
                this.currentPlaylist = songs;
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
                
                songDiv.innerHTML = 
                    '<img src="' + (song.thumbnail || '') + '" alt="' + song.title + '" class="song-thumbnail">' +
                    '<div class="song-info">' +
                        '<div class="song-title">' + this.truncateText(song.title, 50) + '</div>' +
                        '<div class="song-artist">' + song.artist + '</div>' +
                    '</div>' +
                    '<div class="song-duration">' + song.duration + '</div>' +
                    '<button class="download-btn" onclick="app.downloadSong(' + index + ')">' +
                        '<i class="fas fa-download"></i>' +
                    '</button>' +
                    '<button class="play-btn" onclick="app.playSong(' + index + ')">' +
                        '<i class="fas fa-play"></i>' +
                    '</button>';
                
                return songDiv;
            }
            
            async downloadSong(index) {
                const song = this.currentPlaylist[index];
                if (!song) return;
                
                try {
                    this.showNotification('Starting download...', 'info');
                    
                    const link = document.createElement('a');
                    link.href = '/api/download/' + song.videoId;
                    link.download = song.title + ' - ' + song.artist + '.mp3';
                    link.click();
                    
                    this.showNotification('Download started! Check your downloads folder.', 'success');
                    
                } catch (error) {
                    console.error('Download error:', error);
                    this.showNotification('Download failed. Please try again.', 'error');
                }
            }
            
            async playSong(index) {
                this.currentIndex = index;
                this.currentSong = this.currentPlaylist[index];
                
                if (!this.currentSong) return;
                
                try {
                    console.log('Playing:', this.currentSong.title);
                    
                    // Use YouTube embed for playing
                    const embedUrl = 'https://www.youtube.com/embed/' + this.currentSong.videoId + '?autoplay=1&controls=0';
                    
                    // Create hidden iframe for audio
                    let iframe = document.getElementById('youtube-iframe');
                    if (iframe) iframe.remove();
                    
                    iframe = document.createElement('iframe');
                    iframe.id = 'youtube-iframe';
                    iframe.src = embedUrl;
                    iframe.style.position = 'absolute';
                    iframe.style.left = '-9999px';
                    iframe.style.width = '1px';
                    iframe.style.height = '1px';
                    iframe.allow = 'autoplay';
                    
                    document.body.appendChild(iframe);
                    
                    this.updatePlayerDisplay();
                    this.setPlayingState(true);
                    
                } catch (error) {
                    console.error('Play error:', error);
                    this.showNotification('Failed to play song', 'error');
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
                if (!this.currentSong) {
                    if (this.currentPlaylist.length > 0) {
                        this.playSong(0);
                    }
                    return;
                }
                
                // Toggle iframe audio
                const iframe = document.getElementById('youtube-iframe');
                if (iframe) {
                    if (this.isPlaying) {
                        iframe.remove();
                        this.setPlayingState(false);
                    } else {
                        this.playSong(this.currentIndex);
                    }
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
                this.loading.classList.remove('hidden');
                this.resultsSection.classList.add('hidden');
            }
            
            hideLoading() {
                this.loading.classList.add('hidden');
            }
            
            showNotification(message, type) {
                const notification = document.createElement('div');
                notification.className = 'notification ' + type;
                notification.textContent = message;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 4000);
            }
            
            truncateText(text, maxLength) {
                if (!text) return 'Unknown';
                return text.length > maxLength ? 
                    text.substring(0, maxLength) + '...' : 
                    text;
            }
        }

        window.app = new KeyanMusicApp();
        console.log('Keyan Music App Initialized');
    </script>
</body>
</html>`;
    
    res.send(htmlContent);
});

// Export for production
export default app;

// Local development server
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🎵 Keyan Music server running at http://localhost:${port}`);
    });
}


