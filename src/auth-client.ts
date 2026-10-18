export type TokenGetter = () => Promise<string | null>;

export async function api<T>(url: string, options?: RequestInit, getToken?: TokenGetter): Promise<T> {
  const token = getToken ? await getToken() : null;
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed. Please retry.');
  return result;
}
