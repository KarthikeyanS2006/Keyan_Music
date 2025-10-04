// Keyan Music - Express server for Vercel deployment
import express from 'express';
import cors from 'cors';
import YTMusic from 'ytmusic-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize YTMusic
const ytmusic = new YTMusic();
let isInitialized = false;

async function initializeYTMusic() {
    if (!isInitialized) {
        try {
            await ytmusic.initialize();
            isInitialized = true;
            console.log('✅ YTMusic API initialized');
        } catch (error) {
            console.error('❌ YTMusic initialization failed:', error);
        }
    }
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Keyan Music API is running',
        initialized: isInitialized
    });
});

// API Routes
app.get('/api/search', async (req, res) => {
    try {
        await initializeYTMusic();
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
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
        
        console.log(`📚 Found ${songs.length} songs`);
        res.json(songs);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message,
            initialized: isInitialized
        });
    }
});

app.get('/api/artist/:id', async (req, res) => {
    try {
        await initializeYTMusic();
        const artistData = await ytmusic.getArtist(req.params.id);
        res.json(artistData);
    } catch (error) {
        console.error('❌ Artist error:', error);
        res.status(500).json({ error: 'Failed to get artist data' });
    }
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch all handler for client-side routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Initialize YTMusic on startup
initializeYTMusic();

// For Vercel, we need to export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🎵 Keyan Music server running at http://localhost:${port}`);
    });
}
