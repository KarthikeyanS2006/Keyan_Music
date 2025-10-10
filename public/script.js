class ViMusicApp {
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
    extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

    
    initializeElements() {
        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        
        // Section elements
        this.loading = document.getElementById('loading');
        this.resultsSection = document.getElementById('resultsSection');
        this.featuredSection = document.getElementById('featuredSection');
        this.songsList = document.getElementById('songsList');
        
        // Player elements
        this.player = document.getElementById('player');
        this.playerThumbnail = document.getElementById('playerThumbnail');
        this.playerTitle = document.getElementById('playerTitle');
        this.playerArtist = document.getElementById('playerArtist');
        
        // Control elements
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
           this.progressBar = document.getElementById('progressBar');
      this.currentTimeLabel = document.getElementById('currentTime');
      this.durationLabel = document.getElementById('duration');
    }
    
    initializeYouTubePlayer() {
        // This function is called when YouTube IFrame API is ready
        window.onYouTubeIframeAPIReady = () => {
       
            this.youtubePlayer = new YT.Player('youtube-player', {
                height: '1',
                width: '1',
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'fs': 0,
                    'cc_load_policy': 0,
                    'iv_load_policy': 3,
                    'autohide': 1
                },
                events: {
                    'onReady': (event) => {
                     
                        this.isPlayerReady = true;
                        this.youtubePlayer.setVolume(50);
                    },
                    'onStateChange': (event) => {
                        this.onPlayerStateChange(event);
                    },
                    'onError': (event) => {
                      
                        this.nextSong(); // Skip to next song on error
                    }
                }
            });
        };
    }
    
  onPlayerStateChange(event) {
    const states = {
        [-1]: 'unstarted',
        [0]: 'ended',
        [1]: 'playing',
        [2]: 'paused',
        [3]: 'buffering',
        [5]: 'video cued'
    };
    
    const state = states[event.data];
  
    
    switch (event.data) {
        case YT.PlayerState.PLAYING:
            this.setPlayingState(true);
            break;
        case YT.PlayerState.PAUSED:
            this.setPlayingState(false);
            break;
        case YT.PlayerState.ENDED:
            this.nextSong();
            break;
        case YT.PlayerState.BUFFERING:
  
            break;
    }
}

    
bindEvents() {
  this.searchBtn.addEventListener('click', () => this.performSearch());
  this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
  });
  this.progressBar.addEventListener('input', (e) => {
    if (this.isPlayerReady) {
      const seekToSeconds = (e.target.value / 100) * this.youtubePlayer.getDuration();
      this.youtubePlayer.seekTo(seekToSeconds, true);
    }
  });
  // ...rest remains same


        
        // Player control events
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });
    }
                                          
updateProgress() {
  if (!this.isPlayerReady || !this.youtubePlayer) return;
  
  const duration = this.youtubePlayer.getDuration();
  const currentTime = this.youtubePlayer.getCurrentTime();
  if (isNaN(duration) || isNaN(currentTime)) return;
  
  const progressPercent = (currentTime / duration) * 100;
  
  this.progressBar.value = progressPercent;
  this.currentTimeLabel.textContent = this.formatTime(currentTime);
  this.durationLabel.textContent = this.formatTime(duration);
}

formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// In your player state change or during playback, call updateProgress regularly
onPlayerStateChange(event) {
  // Existing switch case...
  if (event.data == YT.PlayerState.PLAYING) {
    this.setPlayingState(true);
    this.progressInterval = setInterval(() => this.updateProgress(), 500);
  } else {
    this.setPlayingState(false);
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
    
  async performSearch() {
    let query = this.searchInput.value.trim();
    if (!query) return;

    // Check if the query is a YouTube URL, extract videoId if so
    const videoId = this.extractYouTubeVideoId(query);
    if (videoId) {
        query = videoId; // Use just the videoId as search query
    }

    this.showLoading();

    try {
        console.log(`🔍 Searching for: "${query}"`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Search failed');
        }

        const songs = await response.json();

        if (songs.error) {
            throw new Error(songs.message || songs.error);
        }

        this.displayResults(songs);

    } catch (error) {
        console.error('❌ Search error:', error);

        if (error.name === 'AbortError') {
            this.showError('Search timed out. The server might be initializing. Please try again in a moment.');
        } else {
            this.showError(`Search failed: ${error.message}. Please try again.`);
        }
    } finally {
        this.hideLoading();
    }
}


    
    displayResults(songs) {
        this.currentPlaylist = songs;
        this.hideAllSections();
        this.resultsSection.classList.remove('hidden');
        
        this.songsList.innerHTML = '';
        
        if (songs.length === 0) {
            this.songsList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: rgba(255,255,255,0.6);">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No songs found. Try a different search term.</p>
                </div>
            `;
            return;
        }
        
        songs.forEach((song, index) => {
            const songElement = this.createSongElement(song, index);
            this.songsList.appendChild(songElement);
        });
        
 
    }
    
    createSongElement(song, index) {
        const songDiv = document.createElement('div');
        songDiv.className = 'song-item';
        songDiv.addEventListener('click', () => this.playSong(index));
        
        // Add playing indicator
        const playingIndicator = this.currentSong && this.currentSong.videoId === song.videoId && this.isPlaying ? 
            `<div class="playing-indicator">
                <div class="playing-bar"></div>
                <div class="playing-bar"></div>
                <div class="playing-bar"></div>
            </div>` : '';
        
        songDiv.innerHTML = `
            <img src="${song.thumbnail || ''}" alt="${song.title}" class="song-thumbnail" 
                 onerror="this.style.background='linear-gradient(45deg, #ff6b6b, #4ecdc4)'; this.src='';">
            <div class="song-info">
                <div class="song-title">${this.truncateText(song.title, 50)}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-duration">${this.formatDuration(song.duration)}</div>
            ${playingIndicator}
            <button class="play-btn ${this.currentSong && this.currentSong.videoId === song.videoId ? 'playing' : ''}" 
                    onclick="event.stopPropagation(); app.playSong(${index})">
                <i class="fas ${this.currentSong && this.currentSong.videoId === song.videoId && this.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
            </button>
        `;
        
        return songDiv;
    }
    
  async playSong(index) {
  this.currentIndex = index;
  this.currentSong = this.currentPlaylist[index];
  
  if (!this.currentSong) return;

  // Extract video ID safely
 const videoId = this.extractYouTubeVideoId(this.currentSong.videoId) || this.currentSong.videoId;


  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0`;

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
            this.playerThumbnail.style.display = 'block';
        } else {
            this.playerThumbnail.style.display = 'none';
        }
    }
    
    updatePlayButtons() {
        // Update all play buttons in the list
        const playButtons = document.querySelectorAll('.play-btn');
        playButtons.forEach((btn, index) => {
            const icon = btn.querySelector('i');
            if (index === this.currentIndex && this.isPlaying) {
                icon.className = 'fas fa-pause';
                btn.classList.add('playing');
            } else {
                icon.className = 'fas fa-play';
                btn.classList.remove('playing');
            }
        });
    }
    
    togglePlay() {
        if (!this.isPlayerReady) {
      
            return;
        }
        
        if (!this.currentSong) {
            if (this.currentPlaylist.length > 0) {
                this.playSong(0);
            }
            return;
        }
        
        try {
            if (this.isPlaying) {
                this.youtubePlayer.pauseVideo();
            } else {
                this.youtubePlayer.playVideo();
            }
        } catch (error) {
            console.error('❌ Error toggling playback:', error);
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
        
        this.updatePlayButtons();
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
    
    toggleShuffle() {
       
        this.shuffleBtn.classList.toggle('active');
    }
    
    toggleRepeat() {
     
        this.repeatBtn.classList.toggle('active');
    }
    
    setVolume(volume) {
        if (this.isPlayerReady && this.youtubePlayer) {
            this.youtubePlayer.setVolume(volume);
        }
       
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
        this.featuredSection.classList.add('hidden');
    }
    
    showError(message) {
        console.error(message);
        alert(message);
    }
    
    truncateText(text, maxLength) {
        return text.length > maxLength ? 
            text.substring(0, maxLength) + '...' : 
            text;
    }
    
    formatDuration(duration) {
        if (!duration || duration === 'Unknown') return 'Unknown';
        if (typeof duration === 'string') return duration;
        
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ViMusicApp();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            if (window.app) window.app.togglePlay();
            break;
        case 'ArrowRight':
            if (window.app) window.app.nextSong();
            break;
        case 'ArrowLeft':
            if (window.app) window.app.previousSong();
            break;
    }
});
extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}







