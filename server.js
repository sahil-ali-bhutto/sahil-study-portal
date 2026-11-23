require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!process.env.LOGIN_PASSWORD || !process.env.SESSION_SECRET || !process.env.LOGIN_USERNAME) {
  console.error('Missing LOGIN_USERNAME, LOGIN_PASSWORD or SESSION_SECRET. Configure them in your hosting environment.');
  process.exit(1);
}
const passwordHash = bcrypt.hashSync(process.env.LOGIN_PASSWORD, 12);
const loginUsername = process.env.LOGIN_USERNAME;
const dbPath = path.join(DATA_DIR, 'portal.sqlite');
const Database = null;
// Lightweight JSON metadata store; writes are atomic and files remain on the persistent data volume.
const metaPath = path.join(DATA_DIR, 'files.json');
if (!fs.existsSync(metaPath)) fs.writeFileSync(metaPath, '[]');
let files = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const saveFiles = () => {
  const tmp = metaPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(files, null, 2));
  fs.renameSync(tmp, metaPath);
};

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], scriptSrc: ["'self'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], upgradeInsecureRequests: null } } }));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
const requireAuth = (req, res, next) => req.session.authenticated ? next() : res.status(401).json({ error: 'Please log in first.' });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).slice(0, 12))
});
const maxBytes = Math.max(1, Number(process.env.MAX_FILE_SIZE_MB || 500)) * 1024 * 1024;
const upload = multer({ storage, limits: { fileSize: maxBytes, files: 1 }, fileFilter: (_req, file, cb) => {
  const allowed = /^(application\/pdf|video\/(mp4|webm|quicktime)|image\/(jpeg|png|webp)|text\/plain|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;
  cb(allowed.test(file.mimetype) ? null : new Error('File type not supported. Upload PDF, video, image, TXT or DOCX.'), allowed.test(file.mimetype));
} });

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const nameOk = typeof username === 'string' && username === loginUsername;
  const passOk = typeof password === 'string' && bcrypt.compareSync(password, passwordHash);
  if (!nameOk || !passOk) return res.status(401).json({ error: 'Incorrect username or password.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not start secure session.' });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});
app.post('/api/logout', requireAuth, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req, res) => res.json({ authenticated: !!req.session.authenticated, displayName: 'SAHIL FAZAL MOHAMMAD BHUTTO' }));
app.get('/api/files', requireAuth, (_req, res) => res.json(files));
app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'Choose a file first.' });
    const item = { id: crypto.randomUUID(), name: path.basename(req.file.originalname), stored: req.file.filename, mime: req.file.mimetype, size: req.file.size, subject: String(req.body.subject || 'General').slice(0, 60), created: new Date().toISOString() };
    files.unshift(item); saveFiles(); res.json(item);
  });
});
app.get('/api/files/:id/download', requireAuth, (req, res) => {
  const item = files.find(f => f.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'File not found.' });
  const full = path.join(UPLOAD_DIR, path.basename(item.stored));
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Stored file is missing.' });
  res.download(full, item.name);
});
app.delete('/api/files/:id', requireAuth, (req, res) => {
  const index = files.findIndex(f => f.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'File not found.' });
  const [item] = files.splice(index, 1);
  const full = path.join(UPLOAD_DIR, path.basename(item.stored));
  if (fs.existsSync(full)) fs.unlinkSync(full);
  saveFiles(); res.json({ ok: true });
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Sahil Study Portal running on port ${PORT}`));
