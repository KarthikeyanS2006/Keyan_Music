import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { videoId } = req.query;
  if (!videoId || videoId.length !== 11) return res.status(400).json({ error: 'Invalid video ID' });

  const videoURL = 'https://youtube.com/watch?v=' + videoId;

  if (!ytdl.validateURL(videoURL)) return res.status(400).json({ error: 'Invalid video URL' });

  try {
    const info = await ytdl.getInfo(videoURL, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    });

    const title = info.videoDetails.title
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50) || 'song';

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Cache-Control', 'no-cache');

    const audioStream = ytdl(videoURL, {
      quality: 'lowestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    });

    audioStream.pipe(res);

    audioStream.on('error', err => {
      if (!res.headersSent) res.status(500).json({ error: 'Download failed', message: err.message });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Unable to get video information', message: err.message });
  }
}
