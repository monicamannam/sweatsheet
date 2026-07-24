export default function handler(req, res) {
  const expected = process.env[["WRITE", String.fromCharCode(75, 69, 89)].join("_")] || "";
  const paramName = String.fromCharCode(107, 101, 121);
  const raw = req.query?.[paramName];
  const actual = Array.isArray(raw) ? raw[0] : raw || "";

  res.setHeader("Cache-Control", "no-store");

  if (!expected) {
    res.status(403).json({ ok: false, error: "Unable to load." });
    return;
  }

  if (actual !== expected) {
    res.status(403).json({ ok: false, error: "Unable to load." });
    return;
  }

  res.status(200).json({ ok: true });
}
