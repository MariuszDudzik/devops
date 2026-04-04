const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
app.use(express.json());

const FILE = 'items.json';
const instanceId = process.env.INSTANCE_ID || uuidv4();
// const instanceId = uuidv4();

function loadItems() {
  if (!fs.existsSync(FILE)) return [];
  const data = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(data);
}

function saveItems(items) {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

let items = loadItems();

app.get('/items', (req, res) => {
  res.json(items);
});

app.post('/items', (req, res) => {
  const item = { id: uuidv4(), name: req.body.name };
  items.push(item);
  saveItems(items);
  res.status(201).json(item);
});

app.get('/stats', (req, res) => {
  res.json({
    count: items.length,
    instance: instanceId
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => console.log('Backend running on port 3000'));