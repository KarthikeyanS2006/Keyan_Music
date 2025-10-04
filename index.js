import YTMusic from 'ytmusic-api';

class ViMusicClone {
    constructor() {
        this.ytmusic = new YTMusic();
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await this.ytmusic.initialize();
            this.isInitialized = true;
            console.log('✅ YTMusic API initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize YTMusic API:', error);
        }
    }

    async searchSongs(query, limit = 20) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log(`🔍 Searching for: "${query}"`);
            const results = await this.ytmusic.search(query);
            
            // Filter only songs and videos
            const songs = results.filter(item => 
                item.type === 'SONG' || item.type === 'VIDEO'
            ).slice(0, limit);

            console.log(`📚 Found ${songs.length} songs:`);
            songs.forEach((song, index) => {
                console.log(`${index + 1}. ${song.name || song.title}`);
                console.log(`   Artist: ${song.artist?.name || 'Unknown'}`);
                console.log(`   Duration: ${song.duration || 'Unknown'}`);
                console.log(`   Video ID: ${song.videoId}`);
                console.log('---');
            });

            return songs;
        } catch (error) {
            console.error('❌ Search failed:', error);
            return [];
        }
    }

    async createPlaylist(searchQuery, maxSongs = 50) {
        const songs = await this.searchSongs(searchQuery, maxSongs);
        this.currentPlaylist = songs;
        this.currentIndex = 0;
        
        if (songs.length > 0) {
            console.log(`🎵 Created playlist with ${songs.length} songs`);
            return true;
        }
        return false;
    }

    getCurrentSong() {
        if (this.currentPlaylist.length > 0 && this.currentIndex < this.currentPlaylist.length) {
            return this.currentPlaylist[this.currentIndex];
        }
        return null;
    }

    nextSong() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0; // Loop back to start
        }
        const song = this.getCurrentSong();
        if (song) {
            console.log(`⏭️  Next: ${song.name || song.title}`);
        }
        return song;
    }

    previousSong() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = this.currentPlaylist.length - 1; // Loop to end
        }
        const song = this.getCurrentSong();
        if (song) {
            console.log(`⏮️  Previous: ${song.name || song.title}`);
        }
        return song;
    }

    async getArtistInfo(artistId) {
        try {
            const artist = await this.ytmusic.getArtist(artistId);
            console.log(`👤 Artist: ${artist.name}`);
            console.log(`📊 Subscribers: ${artist.subscribers || 'Unknown'}`);
            return artist;
        } catch (error) {
            console.error('❌ Failed to get artist info:', error);
            return null;
        }
    }

    async getAlbumInfo(albumId) {
        try {
            const album = await this.ytmusic.getAlbum(albumId);
            console.log(`💿 Album: ${album.title}`);
            console.log(`👤 Artist: ${album.artist?.name || 'Unknown'}`);
            console.log(`📅 Year: ${album.year || 'Unknown'}`);
            return album;
        } catch (error) {
            console.error('❌ Failed to get album info:', error);
            return null;
        }
    }

    displayCurrentPlaylist() {
        if (this.currentPlaylist.length === 0) {
            console.log('📭 No playlist loaded');
            return;
        }

        console.log('\n🎵 Current Playlist:');
        console.log('═'.repeat(50));
        
        this.currentPlaylist.forEach((song, index) => {
            const isPlaying = index === this.currentIndex ? '▶️  ' : '   ';
            console.log(`${isPlaying}${index + 1}. ${song.name || song.title}`);
            console.log(`     Artist: ${song.artist?.name || 'Unknown'}`);
            if (song.album?.name) {
                console.log(`     Album: ${song.album.name}`);
            }
            console.log(`     Duration: ${song.duration || 'Unknown'}`);
            console.log('');
        });
    }
}

// Demo usage
async function demo() {
    console.log('🎸 Vi Music Clone Demo');
    console.log('═'.repeat(30));
    
    const player = new ViMusicClone();
    
    // Initialize the API
    await player.initialize();
    
    // Search and create playlist
    await player.createPlaylist('indie rock 2024', 10);
    
    // Display current playlist
    player.displayCurrentPlaylist();
    
    // Simulate player controls
    console.log('\n🎮 Player Controls Demo:');
    console.log('═'.repeat(30));
    
    const currentSong = player.getCurrentSong();
    if (currentSong) {
        console.log(`🎵 Now Playing: ${currentSong.name || currentSong.title}`);
        console.log(`   Watch URL: https://music.youtube.com/watch?v=${currentSong.videoId}`);
    }
    
    // Next song
    player.nextSong();
    
    // Previous song  
    player.previousSong();
    
    // Search for specific artist
    console.log('\n🔍 Artist Search Demo:');
    console.log('═'.repeat(30));
    await player.searchSongs('Taylor Swift', 5);
}

// Run the demo
demo().catch(console.error);
