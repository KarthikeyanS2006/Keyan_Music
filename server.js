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

// Initialize YTMusic with better error handling
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
        initialized: isInitialized,
        timestamp: new Date().toISOString()
    });
});

// API Routes with better error handling
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        console.log(`🔍 API Search: "${query}"`);
        
        // Initialize YTMusic with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 30000)
        );
        
        const ytm = await Promise.race([initializeYTMusic(), timeoutPromise]);
        
        if (!ytm) {
            throw new Error('YTMusic not initialized');
        }
        
        console.log('🔍 Performing search...');
        const results = await ytm.search(query);
        
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
            initialized: isInitialized,
            suggestion: 'Try searching again in a few moments'
        });
    }
});

app.get('/api/artist/:id', async (req, res) => {
    try {
        const ytm = await initializeYTMusic();
        const artistData = await ytm.getArtist(req.params.id);
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

// Initialize YTMusic on startup (but don't block)
setTimeout(() => {
    initializeYTMusic().catch(err => {
        console.error('❌ Background initialization failed:', err);
    });
}, 1000);

// For Vercel, we need to export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🎵 Keyan Music server running at http://localhost:${port}`);
    });
}
