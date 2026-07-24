export default function handler(req, res) {
  const expected = process.env.WRITE_KEY || "";
  const rawKey = req.query?.key;
  const actual = Array.isArray(rawKey) ? rawKey[0] : rawKey || "";

  res.setHeader("Cache-Control", "no-store");

  if (!expected) {
    res.status(403).json({ ok: false, error: "WRITE_KEY is not configured." });
    return;
  }

  if (actual !== expected) {
    res.status(403).json({ ok: false, error: "Write key required." });
    return;
  }

  res.status(200).json({ ok: true });
}
