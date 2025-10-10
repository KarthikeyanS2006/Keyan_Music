export default function handler(req, res) {
  res.status(501).json({ message: 'Not implemented. Use client-side localStorage for recently played.' });
}
