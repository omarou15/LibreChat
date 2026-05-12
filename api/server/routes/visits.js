const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();
const VISITS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'visits');

router.use(requireJwtAuth);

router.get('/', (_req, res) => {
  if (!fs.existsSync(VISITS_DIR)) {
    return res.json({ visits: [] });
  }
  const files = fs.readdirSync(VISITS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      filename: f.replace('.json', ''),
      size: fs.statSync(path.join(VISITS_DIR, f)).size,
      updatedAt: fs.statSync(path.join(VISITS_DIR, f)).mtime,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ visits: files });
});

router.get('/:filename', (req, res) => {
  const safe = req.params.filename.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 120);
  const filepath = path.join(VISITS_DIR, `${safe}.json`);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${safe}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filepath);
});

module.exports = router;
