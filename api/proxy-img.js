// Vercel serverless function for /api/proxy-img

// Vercel serverless function handler
export default async (req, res) => {
  try {
    // Set headers
    res.setHeader("Cache-Control", "no-store");
    
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    const q = req.query || {};
    const url = q.url || q.u; // accept both ?url= and ?u=
    if (!url) {
      return res.status(400).json({ ok: false, error: 'Missing url parameter' });
    }
    
    // Handle data URIs
    if (String(url).startsWith('data:')) {
      const [header, data] = String(url).split(',');
      const contentType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', data.length);
      return res.send(Buffer.from(data, 'base64'));
    }
    
    // For external URLs, redirect to the original URL
    // In a production environment, you might want to proxy the image
    res.redirect(302, String(url));
    
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
