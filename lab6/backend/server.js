const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

const instanceId = process.env.INSTANCE_ID || uuidv4();

let cacheHits = 0;

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'db',
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port:     5432,
});

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'cache',
    port: 6379,
  },
});

redisClient.on('error', (err) => console.error('Redis error:', err));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id    SERIAL PRIMARY KEY,
      name  TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `);
  console.log('Database ready.');
}

app.get('/items', async (req, res) => {
  try {
    const cached = await redisClient.get('items');
    if (cached) {
      cacheHits++;
      console.log(`Cache HIT (total: ${cacheHits})`);
      return res.json(JSON.parse(cached));
    }

    console.log('Cache MISS — querying database');
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    await redisClient.setEx('items', 30, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/items', async (req, res) => {
  try {
    const { name, price = 0 } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    await redisClient.del('items');
    console.log('Cache invalidated after POST /items');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM products');
    res.json({
      count:      parseInt(result.rows[0].count, 10),
      instance:   instanceId,
      cache_hits: cacheHits,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await redisClient.connect();
  console.log('Redis connected.');
  await initDb();
  app.listen(3000, () => console.log(`Backend running on port 3000 (instance: ${instanceId})`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
