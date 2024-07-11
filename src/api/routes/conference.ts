import Elysia, { t } from "elysia";
import { db } from "$db/db";
import { ConferencePlain } from "$db/prismabox/Conference";

export const conference = new Elysia().get(
	"/conference",
	async () => {
		return db.conference.findMany();
	},
	{
		response: t.Array(ConferencePlain),
	},
);
