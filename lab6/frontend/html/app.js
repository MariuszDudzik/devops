
async function loadProducts() {
  const res = await fetch('/api/items');
  const items = await res.json();
  const list = document.getElementById('productList');
  list.innerHTML = items.length
    ? items.map(i => `<li>${i.name} — <b>${parseFloat(i.price).toFixed(2)} zł</b></li>`).join('')
    : '<li><em>Brak produktów</em></li>';
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  if (!name) return;
  await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price: 0 }),
  });
  document.getElementById('name').value = '';
  loadProducts();
});

loadProducts();
