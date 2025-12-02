const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./models');
const { Product } = require('./models/product');
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

app.use(express.json());

function cosineSimilarity(a, b) {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) { dot += a[i] * b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const embedding = await getImageEmbedding(req.file.path);
    const product = await Product.create({ name, description, price, image_path: req.file.path, embedding });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create product' });
  }
});

app.get('/products', async (req, res) => {
  const items = await Product.findAll({ order: [['id','ASC']] });
  res.json(items);
});

app.get('/products/:id', async (req, res) => {
  const item = await Product.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

app.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const item = await Product.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    const { name, description, price } = req.body;
    let updates = { name, description, price };
    if (req.file) {
      const embedding = await getImageEmbedding(req.file.path);
      if (item.image_path) { fs.existsSync(item.image_path) && fs.unlinkSync(item.image_path); }
      updates.image_path = req.file.path;
      updates.embedding = embedding;
    }
    await item.update(updates);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'failed to update product' });
  }
});

app.delete('/products/:id', async (req, res) => {
  const item = await Product.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (item.image_path && fs.existsSync(item.image_path)) { try { fs.unlinkSync(item.image_path); } catch (_) {} }
  await item.destroy();
  res.json({ ok: true });
});

app.post('/search/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const queryEmb = await getImageEmbedding(req.file.path);
    await fs.promises.unlink(req.file.path).catch(() => {});
    const items = await Product.findAll({ where: { embedding: { [require('sequelize').Op.ne]: null } } });
    const scored = items.map(p => ({ product: p, score: cosineSimilarity(queryEmb, p.embedding || []) }));
    scored.sort((a,b) => b.score - a.score);
    res.json(scored.slice(0, 5).map(s => ({ id: s.product.id, name: s.product.name, score: s.score })));
  } catch (err) {
    res.status(500).json({ error: 'failed to search' });
  }
});

const port = process.env.PORT || 3000;
sequelize.authenticate().then(() => {
  app.listen(port, () => { console.log(`Server listening on http://localhost:${port}`); });
}).catch(() => {
  console.error('Database connection failed');
});
