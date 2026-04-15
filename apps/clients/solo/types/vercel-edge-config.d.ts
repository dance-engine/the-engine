declare module '@vercel/edge-config' {
  export function get<T = unknown>(key: string): Promise<T | null>;
}
