/** Simulates network latency so loading states are visible while working on mocks. */
export function mockResponse<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(JSON.parse(JSON.stringify(data)) as T), ms),
  );
}
