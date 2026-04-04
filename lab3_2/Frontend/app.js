const list = document.getElementById('productList');
const form = document.getElementById('productForm');

function loadProducts() {
  fetch('/api/items')
    .then(res => res.json())
    .then(data => {
      list.innerHTML = '';
      data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name;
        list.appendChild(li);
      });
    });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;

  fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then(() => {
    loadProducts();
    form.reset();
  });
});

loadProducts();