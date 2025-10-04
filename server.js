// Express server for Vi Music Clone
import express from 'express';
import cors from 'cors';
import YTMusic from 'ytmusic-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Initialize YTMusic
const ytmusic = new YTMusic();
let isInitialized = false;

async function initializeYTMusic() {
    if (!isInitialized) {
        await ytmusic.initialize();
        isInitialized = true;
        console.log('✅ YTMusic API initialized');
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/search', async (req, res) => {
    try {
        await initializeYTMusic();
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`🔍 API Search: "${query}"`);
        const results = await ytmusic.search(query);
        
        // Filter and format results
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
        
        res.json(songs);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/artist/:id', async (req, res) => {
    try {
        await initializeYTMusic();
        const artistData = await ytmusic.getArtist(req.params.id);
        res.json(artistData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get artist data' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🎵 Vi Music Clone server running at http://localhost:${port}`);
    initializeYTMusic();
});
