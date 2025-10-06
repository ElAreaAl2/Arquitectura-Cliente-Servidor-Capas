# Arquitectura Cliente-Servidor en Capas

Este proyecto implementa un servicio gRPC para administrar usuarios, deseos y
sugerencias de ciudades. Además del backend gRPC, el repositorio incluye un
**gateway REST** en FastAPI y un **frontend** en Next.js que se comunican con el
servicio principal.

## Requisitos previos

* Python 3.10+
* Node.js 18+ y npm
* MongoDB 5+ (local o remoto)
* `protoc` y `grpcio-tools` (se instalan con los requisitos de Python)

> 💡 Si no tienes MongoDB instalado localmente, puedes levantarlo con Docker:
>
> ```bash
> docker run --name sad-mongo -p 27017:27017 -d mongo:6
> ```

## Preparación del entorno backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Generar código gRPC (una sola vez o cuando cambie el proto)

```bash
python -m grpc_tools.protoc \
  -I SAD-proto/proto \
  --python_out=sad_app/generated \
  --grpc_python_out=sad_app/generated \
  SAD-proto/proto/wishlist.proto
```

Asegúrate de que existan los archivos `__init__.py` en los paquetes de Python:

```bash
python - <<'PY'
from pathlib import Path
for path in [
    Path('sad_app/__init__.py'),
    Path('sad_app/generated/__init__.py')
]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch()
PY
```

### Variables de entorno principales

* `MONGO_URI`: cadena de conexión a MongoDB (por defecto `mongodb://localhost:27017`).
* `MONGO_DB`: nombre de la base de datos (por defecto `sad_db`).
* `SAD_PORT`: puerto del servidor gRPC (por defecto `50051`).
* `SAD_GRPC_TARGET`: dirección del servidor gRPC usada por el gateway REST (por defecto `localhost:50051`).
* `SAD_REST_PORT`: puerto del gateway REST (por defecto `8000`).

Puedes crear un archivo `.env` en la raíz con estas variables si lo prefieres.

### Inicializar datos de ciudades

```bash
python -m sad_app.seed_cities
```

### Ejecutar el servidor gRPC

```bash
python -m sad_app.server
```

El servidor quedará atendiendo en `localhost:50051` (o el valor de `SAD_PORT`).

## Gateway REST (FastAPI)

En otra terminal (con el entorno virtual activado), ejecuta:

```bash
export SAD_GRPC_TARGET=localhost:50051
uvicorn sad_app.rest_gateway:app --host 0.0.0.0 --port 8000
```

El gateway expondrá endpoints REST como `/users`, `/wishes`, `/cities/autocomplete`,
traduciendo las peticiones al backend gRPC.

## Frontend Next.js

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000" npm run dev
```

La aplicación quedará disponible en `http://localhost:3000` consumiendo el gateway REST.

## Pruebas manuales desde la terminal

Con el gateway REST en marcha, puedes ejecutar llamadas de ejemplo:

```bash
# Crear usuario
curl -X POST http://localhost:8000/users \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana","apellido":"García","extra":{"rol":"tester"}}'

# Autocompletar ciudades
curl 'http://localhost:8000/cities/autocomplete?pais=CO&q=Bu&limit=5'

# Crear deseo
curl -X POST http://localhost:8000/wishes \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<ID_USUARIO>","titulo":"Viajar","descripcion":"Visitar feria","pais":"CO","ciudad":"Bucaramanga"}'
```

Reemplaza `<ID_USUARIO>` por el identificador devuelto al crear el usuario.

## Limpieza de artefactos

Si necesitas limpiar archivos compilados de Python:

```bash
find . -name '__pycache__' -type d -prune -exec rm -rf {} +
```

## Scripts útiles

* `quick_test.py`: cliente gRPC de ejemplo para verificar el método `Ping` y
  el autocompletado de ciudades directamente contra el servidor gRPC.
* `sad_app/seed_cities.py`: inicializa la colección de ciudades en MongoDB.
```
