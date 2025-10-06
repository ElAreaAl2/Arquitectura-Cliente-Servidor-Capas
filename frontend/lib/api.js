const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request(path, init) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!response.ok) {
    let errorPayload = {};
    try {
      errorPayload = await response.json();
    } catch (error) {
      // Ignore JSON parsing errors to surface the HTTP status instead.
    }
    const message =
      errorPayload?.detail ?? `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined;
  }

  return await response.json();
}

export async function ping() {
  await request("/health");
  return true;
}

export async function createUser(payload) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUser(userId) {
  return request(`/users/${userId}`);
}

export async function updateUser(userId, payload) {
  return request(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createWish(payload) {
  return request("/wishes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listWishes(userId) {
  return request(`/users/${userId}/wishes`);
}

export async function autocompleteCity(pais, query, limit = 5) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (pais) {
    params.append("pais", pais);
  }
  return request(`/cities/autocomplete?${params.toString()}`);
}
