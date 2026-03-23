import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import generateRoutes from './routes/generate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(process.cwd(), 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicPath));
app.use('/api', generateRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});