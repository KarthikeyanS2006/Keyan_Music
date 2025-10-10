import YTMusic from 'ytmusic-api';

let ytmusic = null;
let isInitialized = false;
let initPromise = null;

async function initializeYTMusic() {
  if (isInitialized) return ytmusic;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
    isInitialized = true;
    return ytmusic;
  })();

  return initPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q: query, limit = 20 } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const ytm = await initializeYTMusic();
    const results = await ytm.search(query);

    const songs = results.filter(item =>
      item.type === 'SONG' || item.type === 'VIDEO'
    ).slice(0, Number(limit)).map(song => ({
      id: song.videoId,
      title: song.name || song.title,
      artist: song.artist?.name || 'Unknown',
      duration: song.duration || 'Unknown',
      thumbnail: song.thumbnails?.[0]?.url || '',
      videoId: song.videoId,
      type: song.type
    }));

    res.status(200).json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
}
