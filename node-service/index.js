const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const getImageEmbedding = require('./clip');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + (ext || ''));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/datetime', (req, res) => {
  res.json({ datetime: new Date().toISOString() });
});

app.post('/embed', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(415).json({ error: 'unsupported media type' });
    }

    const embedding = await getImageEmbedding(req.file.path);
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.json({ embedding, dims: embedding.length, model: 'Xenova/clip-vit-base-patch32' });
  } catch (err) {
    res.status(500).json({ error: 'failed to compute embedding' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
