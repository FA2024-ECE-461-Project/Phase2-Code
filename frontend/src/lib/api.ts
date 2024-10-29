import { hc } from 'hono/client';
import { type ApiRoutes } from '../../../server/app'; // Import the type from the server for type safety

const client = hc<ApiRoutes>('/');

export const api = client.api;