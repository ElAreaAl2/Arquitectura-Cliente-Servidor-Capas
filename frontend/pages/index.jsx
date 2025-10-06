import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  autocompleteCity,
  createUser,
  createWish,
  getUser,
  listWishes,
  ping,
  updateUser,
} from "../lib/api";

const healthFetcher = async () => {
  await ping();
  return { ok: true };
};

function parseExtra(raw) {
  const extra = {};
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        extra[key.trim()] = rest.join("=").trim();
      }
    });
  return extra;
}

function formatExtra(extra) {
  return Object.entries(extra)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

export default function HomePage() {
  const { data: health, error: healthError, isLoading: healthLoading } = useSWR(
    "health",
    healthFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const [createdUser, setCreatedUser] = useState(null);
  const [fetchedUser, setFetchedUser] = useState(null);
  const [userIdQuery, setUserIdQuery] = useState("");
  const [updateUserId, setUpdateUserId] = useState("");
  const [userExtraDraft, setUserExtraDraft] = useState("");
  const [createError, setCreateError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const [wishUserId, setWishUserId] = useState("");
  const [wishTitle, setWishTitle] = useState("");
  const [wishDescription, setWishDescription] = useState("");
  const [wishCountry, setWishCountry] = useState("CO");
  const [wishCity, setWishCity] = useState("");
  const [wishError, setWishError] = useState(null);
  const [createdWish, setCreatedWish] = useState(null);
  const [wishes, setWishes] = useState([]);

  const [cityQuery, setCityQuery] = useState("Bu");
  const [cityCountry, setCityCountry] = useState("CO");
  const [cityResults, setCityResults] = useState([]);
  const [cityError, setCityError] = useState(null);

  const healthMessage = useMemo(() => {
    if (healthLoading) {
      return "Comprobando...";
    }
    if (healthError) {
      return `Error: ${healthError.message}`;
    }
    if (health?.ok) {
      return "Servicio gRPC disponible";
    }
    return "Sin verificar";
  }, [health, healthError, healthLoading]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCreateError(null);
    try {
      const payload = {
        nombre: String(form.get("nombre") || "").trim(),
        apellido: String(form.get("apellido") || "").trim(),
        extra: parseExtra(String(form.get("extra") || "")),
      };
      const user = await createUser(payload);
      setCreatedUser(user);
      setUserExtraDraft(formatExtra(user.extra));
      setUpdateUserId(user.id);
      setWishUserId(user.id);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleGetUser = async (event) => {
    event.preventDefault();
    setLookupError(null);
    try {
      const user = await getUser(userIdQuery.trim());
      setFetchedUser(user);
    } catch (error) {
      setFetchedUser(null);
      setLookupError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    setUpdateError(null);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        nombre: String(form.get("nombre") || "").trim(),
        apellido: String(form.get("apellido") || "").trim(),
        extra: parseExtra(String(form.get("extra") || "")),
      };
      const user = await updateUser(updateUserId.trim(), payload);
      setCreatedUser(user);
      setUpdateUserId(user.id);
      setUserExtraDraft(formatExtra(user.extra));
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateWish = async (event) => {
    event.preventDefault();
    setWishError(null);
    try {
      const wish = await createWish({
        user_id: wishUserId.trim(),
        titulo: wishTitle.trim(),
        descripcion: wishDescription.trim(),
        pais: wishCountry.trim(),
        ciudad: wishCity.trim(),
      });
      setCreatedWish(wish);
    } catch (error) {
      setCreatedWish(null);
      setWishError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleListWishes = async () => {
    setWishError(null);
    try {
      const items = await listWishes(wishUserId.trim());
      setWishes(items);
    } catch (error) {
      setWishError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAutocomplete = async () => {
    setCityError(null);
    try {
      const items = await autocompleteCity(cityCountry.trim(), cityQuery.trim(), 5);
      setCityResults(items);
    } catch (error) {
      setCityResults([]);
      setCityError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <main>
      <h1>SAD · Panel Cliente REST</h1>
      <p>
        Esta interfaz Next.js consume el gateway REST incluido en el repositorio
        y permite interactuar con el backend gRPC sin salir del navegador.
      </p>

      <section>
        <h2>1. Estado del servicio</h2>
        <p>{healthMessage}</p>
      </section>

      <section>
        <h2>2. Crear usuario</h2>
        <form onSubmit={handleCreateUser} className="grid">
          <label>
            Nombre
            <input name="nombre" placeholder="Sebastian" required />
          </label>
          <label>
            Apellido
            <input name="apellido" placeholder="Rodriguez" required />
          </label>
          <label>
            Datos extra (formato clave=valor, uno por línea)
            <textarea
              name="extra"
              placeholder="rol=tester\ntelegram=@seba"
              rows={3}
            />
          </label>
          <button type="submit">Crear usuario</button>
        </form>
        {createError && <p>Error: {createError}</p>}
        {createdUser && (
          <pre>{JSON.stringify(createdUser, null, 2)}</pre>
        )}
      </section>

      <section>
        <h2>3. Consultar usuario</h2>
        <form onSubmit={handleGetUser} className="grid two">
          <label>
            ID de usuario
            <input
              value={userIdQuery}
              onChange={(event) => setUserIdQuery(event.target.value)}
              placeholder="uuid"
              required
            />
          </label>
          <button type="submit">Buscar</button>
        </form>
        {lookupError && <p>Error: {lookupError}</p>}
        {fetchedUser && <pre>{JSON.stringify(fetchedUser, null, 2)}</pre>}
      </section>

      <section>
        <h2>4. Actualizar usuario</h2>
        <form onSubmit={handleUpdateUser} className="grid">
          <label>
            ID de usuario
            <input
              value={updateUserId}
              onChange={(event) => setUpdateUserId(event.target.value)}
              placeholder="uuid"
              required
            />
          </label>
          <label>
            Nombre
            <input name="nombre" placeholder="Sebastian" required />
          </label>
          <label>
            Apellido
            <input name="apellido" placeholder="Rodriguez" required />
          </label>
          <label>
            Datos extra
            <textarea
              name="extra"
              value={userExtraDraft}
              onChange={(event) => setUserExtraDraft(event.target.value)}
              rows={3}
            />
          </label>
          <button type="submit">Guardar cambios</button>
        </form>
        {updateError && <p>Error: {updateError}</p>}
      </section>

      <section>
        <h2>5. Autocompletar ciudades</h2>
        <div className="grid two">
          <label>
            País (opcional)
            <input
              value={cityCountry}
              onChange={(event) => setCityCountry(event.target.value)}
              placeholder="CO"
            />
          </label>
          <label>
            Consulta
            <input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Bu"
              required
            />
          </label>
        </div>
        <button onClick={handleAutocomplete}>Buscar ciudades</button>
        {cityError && <p>Error: {cityError}</p>}
        {cityResults.length > 0 && (
          <ul>
            {cityResults.map((city) => (
              <li key={`${city.pais}-${city.ciudad}`}>
                {city.pais} · {city.ciudad}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>6. Crear y listar deseos</h2>
        <form onSubmit={handleCreateWish} className="grid">
          <label>
            ID de usuario
            <input
              value={wishUserId}
              onChange={(event) => setWishUserId(event.target.value)}
              placeholder="uuid"
              required
            />
          </label>
          <label>
            Título
            <input
              value={wishTitle}
              onChange={(event) => setWishTitle(event.target.value)}
              placeholder="Viajar a la Feria"
              required
            />
          </label>
          <label>
            Descripción
            <textarea
              value={wishDescription}
              onChange={(event) => setWishDescription(event.target.value)}
              placeholder="Feria de las Flores"
              rows={3}
            />
          </label>
          <label>
            País
            <input
              value={wishCountry}
              onChange={(event) => setWishCountry(event.target.value)}
              placeholder="CO"
              required
            />
          </label>
          <label>
            Ciudad
            <input
              value={wishCity}
              onChange={(event) => setWishCity(event.target.value)}
              placeholder="Bucaramanga"
              required
            />
          </label>
          <button type="submit">Crear deseo</button>
        </form>
        <button onClick={handleListWishes} style={{ marginTop: "1rem" }}>
          Listar deseos del usuario
        </button>
        {wishError && <p>Error: {wishError}</p>}
        {createdWish && <pre>{JSON.stringify(createdWish, null, 2)}</pre>}
        {wishes.length > 0 && <pre>{JSON.stringify(wishes, null, 2)}</pre>}
      </section>

      <footer style={{ textAlign: "center", opacity: 0.7 }}>
        Gateway REST configurable mediante NEXT_PUBLIC_API_BASE_URL
      </footer>
    </main>
  );
}
