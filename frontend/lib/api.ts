export type User = {
  id: string;
  nombre: string;
  apellido: string;
  extra: Record<string, string>;
};

export type Wish = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string;
  pais: string;
  ciudad: string;
  creado_en: number;
};

export type City = {
  pais: string;
  ciudad: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message =
      (errorPayload?.detail as string | undefined) ??
      `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function ping(): Promise<boolean> {
  await request<{ ok: boolean }>("/health");
  return true;
}

export async function createUser(payload: Omit<User, "id">): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUser(userId: string): Promise<User> {
  return request<User>(`/users/${userId}`);
}

export async function updateUser(
  userId: string,
  payload: Omit<User, "id">
): Promise<User> {
  return request<User>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createWish(payload: Omit<Wish, "id" | "creado_en">) {
  return request<Wish>("/wishes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listWishes(userId: string): Promise<Wish[]> {
  return request<Wish[]>(`/users/${userId}/wishes`);
}

export async function autocompleteCity(
  pais: string,
  query: string,
  limit = 5
): Promise<City[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (pais) {
    params.append("pais", pais);
  }
  return request<City[]>(`/cities/autocomplete?${params.toString()}`);
}
