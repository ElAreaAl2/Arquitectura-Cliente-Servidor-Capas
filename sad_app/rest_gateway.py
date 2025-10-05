"""REST gateway that proxies HTTP requests to the gRPC DataAdminService.

The module exposes a FastAPI application that keeps a single gRPC channel
open for all incoming HTTP requests.  This allows any REST client –
including the new Next.js frontend – to keep talking HTTP+JSON while the
core of the system remains implemented in gRPC.
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional

import grpc
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from sad_app.generated import wishlist_pb2 as pb
from sad_app.generated import wishlist_pb2_grpc as pb_grpc


GRPC_TARGET = os.getenv("SAD_GRPC_TARGET", "localhost:50051")


app = FastAPI(
    title="SAD REST Gateway",
    description=(
        "Adaptador HTTP que consume el servicio gRPC DataAdminService. "
        "Permite a clientes REST interactuar con las operaciones de usuarios, "
        "deseos y autocompletado de ciudades."
    ),
    version="1.0.0",
)


class UserPayload(BaseModel):
    nombre: str
    apellido: str
    extra: Dict[str, str] = Field(default_factory=dict)


class UserResponseModel(UserPayload):
    id: str


class WishPayload(BaseModel):
    user_id: str
    titulo: str
    descripcion: Optional[str] = ""
    pais: str
    ciudad: str


class WishResponseModel(WishPayload):
    id: str
    creado_en: int


class CityResponseModel(BaseModel):
    pais: str
    ciudad: str


def _grpc_to_http_status(code: grpc.StatusCode) -> int:
    mapping = {
        grpc.StatusCode.INVALID_ARGUMENT: 400,
        grpc.StatusCode.NOT_FOUND: 404,
        grpc.StatusCode.UNAVAILABLE: 503,
        grpc.StatusCode.ALREADY_EXISTS: 409,
        grpc.StatusCode.PERMISSION_DENIED: 403,
        grpc.StatusCode.UNAUTHENTICATED: 401,
    }
    return mapping.get(code, 500)


def _pb_user_to_dict(user: pb.User) -> Dict[str, object]:
    return {
        "id": user.id,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "extra": dict(user.extra),
    }


def _pb_wish_to_dict(wish: pb.Wish) -> Dict[str, object]:
    return {
        "id": wish.id,
        "user_id": wish.user_id,
        "titulo": wish.titulo,
        "descripcion": wish.descripcion,
        "pais": wish.pais,
        "ciudad": wish.ciudad,
        "creado_en": wish.creado_en,
    }


@app.on_event("startup")
async def startup_event() -> None:
    app.state.channel = grpc.aio.insecure_channel(GRPC_TARGET)
    app.state.stub = pb_grpc.DataAdminServiceStub(app.state.channel)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await app.state.channel.close()


async def _call_grpc(method, request):
    try:
        return await method(request)
    except grpc.aio.AioRpcError as exc:  # pragma: no cover - network errors
        detail = exc.details() or exc.code().name
        raise HTTPException(
            status_code=_grpc_to_http_status(exc.code()), detail=detail
        ) from exc


@app.get("/health")
async def health() -> JSONResponse:
    await _call_grpc(app.state.stub.Ping, pb.Empty())
    return JSONResponse({"ok": True})


@app.post("/users", response_model=UserResponseModel)
async def create_user(payload: UserPayload) -> UserResponseModel:
    response = await _call_grpc(
        app.state.stub.CreateUser,
        pb.CreateUserRequest(
            nombre=payload.nombre, apellido=payload.apellido, extra=payload.extra
        ),
    )
    return UserResponseModel(**_pb_user_to_dict(response.user))


@app.get("/users/{user_id}", response_model=UserResponseModel)
async def get_user(user_id: str) -> UserResponseModel:
    response = await _call_grpc(
        app.state.stub.GetUser, pb.GetUserRequest(id=user_id)
    )
    return UserResponseModel(**_pb_user_to_dict(response.user))


@app.put("/users/{user_id}", response_model=UserResponseModel)
async def update_user(user_id: str, payload: UserPayload) -> UserResponseModel:
    response = await _call_grpc(
        app.state.stub.UpsertUser,
        pb.UpsertUserRequest(
            id=user_id,
            nombre=payload.nombre,
            apellido=payload.apellido,
            extra=payload.extra,
        ),
    )
    return UserResponseModel(**_pb_user_to_dict(response.user))


@app.post("/wishes", response_model=WishResponseModel)
async def create_wish(payload: WishPayload) -> WishResponseModel:
    response = await _call_grpc(
        app.state.stub.CreateWish,
        pb.CreateWishRequest(
            user_id=payload.user_id,
            titulo=payload.titulo,
            descripcion=payload.descripcion,
            pais=payload.pais,
            ciudad=payload.ciudad,
        ),
    )
    return WishResponseModel(**_pb_wish_to_dict(response.wish))


@app.get("/users/{user_id}/wishes", response_model=List[WishResponseModel])
async def list_wishes(user_id: str) -> List[WishResponseModel]:
    response = await _call_grpc(
        app.state.stub.ListWishesByUser,
        pb.ListWishesByUserRequest(user_id=user_id),
    )
    return [WishResponseModel(**_pb_wish_to_dict(item)) for item in response.items]


@app.get("/cities/autocomplete", response_model=List[CityResponseModel])
async def autocomplete_cities(
    q: str = Query(..., alias="q"),
    pais: Optional[str] = None,
    limit: int = Query(10, ge=1, le=25),
) -> List[CityResponseModel]:
    response = await _call_grpc(
        app.state.stub.AutocompleteCity,
        pb.AutocompleteCityRequest(pais=pais or "", query=q, limit=limit),
    )
    return [CityResponseModel(pais=item.pais, ciudad=item.ciudad) for item in response.items]


if __name__ == "__main__":  # pragma: no cover - manual invocation
    import uvicorn

    uvicorn.run(
        "sad_app.rest_gateway:app",
        host="0.0.0.0",
        port=int(os.getenv("SAD_REST_PORT", "8000")),
        reload=bool(os.getenv("SAD_REST_RELOAD")),
    )
