// this file is the client-side API setup for the frontend so that frontend can commuincate with the backend.
import { hc } from "hono/client";
import { type ApiRoutes } from "../../../server/app"; // Import the type from the server for type safety

const client = hc<ApiRoutes>("/");

export const api = client.api;  //ensure other files can use api object to make requests to the backend
