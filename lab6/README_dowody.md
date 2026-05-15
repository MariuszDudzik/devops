# Dowody działania — komendy i oczekiwane wyjścia

## Struktura projektu

```
projekt/
├── compose.yml
├── compose.override.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── server.js
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx/
    │   └── nginx.conf
    └── html/
        ├── index.html
        ├── products.html
        ├── stats.html
        ├── style.css
        └── app.js
```

---

## 1. Dowód healthchecku — `docker compose ps`

```bash
docker compose up -d --build
docker compose ps
```

### Oczekiwane wyjście:

```
NAME                IMAGE          COMMAND                  SERVICE    STATUS              PORTS
projekt-backend-1   projekt-backend "node server.js"       backend    Up 30s (healthy)
projekt-cache-1     redis:7-alpine  "docker-entrypoint.s…" cache      Up 35s (healthy)
projekt-db-1        postgres:16-…   "docker-entrypoint.s…" db         Up 40s (healthy)
projekt-nginx-1     projekt-nginx   "/docker-entrypoint.…" nginx      Up 25s            0.0.0.0:80->80/tcp
```

---

## 2. Dowód persystencji

### Krok 1: Dodaj produkt
```bash
curl -s -X POST http://localhost/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"TestPersistencji","price":99.99}'
```
Wyjście:
```json
{"id":1,"name":"TestPersistencji","price":"99.99"}
```

### Krok 2: Zatrzymaj kontenery (BEZ -v — wolumen zostaje)
```bash
docker compose down
```

### Krok 3: Uruchom ponownie
```bash
docker compose up -d
```

### Krok 4: Zweryfikuj dane
```bash
curl -s http://localhost/api/items
```
Oczekiwane wyjście — produkt nadal istnieje:
```json
[{"id":1,"name":"TestPersistencji","price":"99.99"}]
```

---

## 3. Dowód cache — cache_hits ≥ 1

```bash
# Pierwsze wywołanie — cache MISS, dane z bazy
curl -s http://localhost/api/items

# Drugie wywołanie — cache HIT
curl -s http://localhost/api/items

# Sprawdź statystyki
curl -s http://localhost/api/stats
```

Oczekiwane wyjście `/api/stats`:
```json
{"count":1,"instance":"backend-1","cache_hits":1}
```

---

## 4. Dowód profilu tools — db-seed

```bash
docker compose --profile tools run --rm db-seed
```

Wyjście:
```
INSERT 0 3
```

Weryfikacja:
```bash
curl -s http://localhost/api/items
```
Oczekiwane wyjście:
```json
[
  {"id":1,"name":"TestPersistencji","price":"99.99"},
  {"id":2,"name":"Widget","price":"9.99"},
  {"id":3,"name":"Gadget","price":"24.99"},
  {"id":4,"name":"Doohickey","price":"4.49"}
]
```

---

## 5. Produkcja vs. deweloperskie — `docker compose config | grep -A5 volumes`

### Produkcja (bez override):
```bash
docker compose -f compose.yml config | grep -A5 volumes
```
Wyjście — brak bind mountów, tylko named volume:
```yaml
volumes:
  pg-data:
    driver: local
```

### Deweloperskie (z override):
```bash
docker compose config | grep -A5 volumes
```
Wyjście — widoczny bind mount katalogu kodu:
```yaml
volumes:
  - type: bind
    source: ./backend
    target: /app
  - /app/node_modules
  pg-data:
    driver: local
```

---

## Izolacja sieci — weryfikacja

```bash
# backend NIE jest dostępny z zewnątrz (brak portu 3000)
curl http://localhost:3000/health   # Connection refused

# Tylko nginx na porcie 80
curl http://localhost/api/health    # {"status":"ok"}
```
