pip install -r requirements.txt

python -m grpc_tools.protoc -I SAD-proto/proto `
  --python_out=sad_app\generated --grpc_python_out=sad_app\generated `
  SAD-proto/proto/wishlist.proto

New-Item -ItemType File sad_app\generated\__init__.py -Force | Out-Null
Test-Path .\sad_app\generated\wishlist_pb2.py

Test-Path .\sad_app\generated\wishlist_pb2_grpc.py

New-Item -ItemType File .\sad_app\__init__.py -Force | Out-Null

New-Item -ItemType File .\sad_app\generated\__init__.py -Force | Out-Null

Get-ChildItem -Recurse -Include __pycache__ | Remove-Item -Recurse -Force

python .\sad_app\seed_cities.py

python -m sad_app.seed_cities.py

python .\sad_app\server.py

python -m sad_app.server

## Gateway REST

El repositorio incluye un gateway HTTP basado en FastAPI (`sad_app/rest_gateway.py`)
que traduce peticiones REST al servicio gRPC. Para ejecutarlo:

```bash
export SAD_GRPC_TARGET=localhost:50051  # o la dirección donde corre el gRPC
uvicorn sad_app.rest_gateway:app --host 0.0.0.0 --port 8000
```

La variable `SAD_REST_PORT` también puede usarse al ejecutar el módulo
directamente (`python -m sad_app.rest_gateway`).

## Frontend Next.js

En `frontend/` se añadió una aplicación Next.js que consume el gateway REST y
ofrece formularios para crear/consultar usuarios, autocompletar ciudades y
gestionar deseos. Para levantarla en modo desarrollo:

```bash
cd frontend
npm install
npm run dev
```

El frontend espera que la variable `NEXT_PUBLIC_API_BASE_URL` apunte al gateway
REST (por defecto `http://localhost:8000`).
