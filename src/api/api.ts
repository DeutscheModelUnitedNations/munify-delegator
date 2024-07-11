import Elysia from "elysia";
import { conference } from "./routes/conference";

export const app = new Elysia({
	normalize: true,
	prefix: "/api",
})
	.use(conference);

export type App = typeof app;
