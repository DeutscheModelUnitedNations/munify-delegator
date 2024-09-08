import type { AllEntityNames } from '$api/auth/abilities/abilities';
import { permissionsPlugin } from '$api/auth/permissions';
import { db } from '$db/db';
import * as Schemes from '$db/generated/schema/barrel';
import Elysia, { t } from 'elysia';

function capitalizeFirstLetterOfUnion<T extends AllEntityNames>(input: T): Capitalize<T> {
	return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}

//TODO test this

export namespace CRUDMaker {
	export function getAll<EntityName extends AllEntityNames>(entity: EntityName) {
		return new Elysia().use(permissionsPlugin).get(
			`/${entity}`,
			async ({ permissions, query }) => {
				// @ts-ignore
				return await db[entity].findMany({
					where: {
						...(query ?? {}),
						AND: [permissions.allowDatabaseAccessTo('list')[capitalizeFirstLetterOfUnion(entity)]]
					}
				});
			},
			{
				query: t.Optional(Schemes[`${capitalizeFirstLetterOfUnion(entity)}Where`]),
				response: t.Array(Schemes[`${capitalizeFirstLetterOfUnion(entity)}Plain`])
			}
		);
	}

	export function getOne<EntityName extends AllEntityNames>(entity: EntityName) {
		return new Elysia().use(permissionsPlugin).get(
			`/${entity}/:id`,
			async ({ permissions, params }) => {
				// @ts-ignore
				return await db[entity].findUniqueOrThrow({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('read')[capitalizeFirstLetterOfUnion(entity)]
					}
				});
			},
			{
				response: Schemes[`${capitalizeFirstLetterOfUnion(entity)}Plain`]
			}
		);
	}

	export function createOne<EntityName extends AllEntityNames>(entity: EntityName) {
		const capitalizedEntityName = capitalizeFirstLetterOfUnion(entity);
		return new Elysia().use(permissionsPlugin).post(
			`/${entity}`,
			async ({ permissions, body }) => {
				permissions.checkIf((user) => user.can('create', capitalizeFirstLetterOfUnion(entity)));
				// @ts-ignore
				return await db[entity].create({
					data: body
				});
			},
			{
				body: Schemes[`${capitalizedEntityName}InputCreate`],
				response: Schemes[`${capitalizedEntityName}Plain`]
			}
		);
	}

	export function updateOne<EntityName extends AllEntityNames>(entity: EntityName) {
		const capitalizedEntityName = capitalizeFirstLetterOfUnion(entity);
		return new Elysia().use(permissionsPlugin).patch(
			`/${entity}/:id`,
			async ({ permissions, params, body }) => {
				// @ts-ignore
				return await db[entity].update({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('update')[capitalizeFirstLetterOfUnion(entity)]
					},
					data: body
				});
			},
			{
				body: Schemes[`${capitalizedEntityName}InputUpdate`],
				response: Schemes[`${capitalizedEntityName}Plain`]
			}
		);
	}

	export function deleteOne<EntityName extends AllEntityNames>(entity: EntityName) {
		return new Elysia().use(permissionsPlugin).delete(
			`/${entity}/:id`,
			async ({ permissions, params }) => {
				// @ts-ignore
				return await db[entity].delete({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('delete')[capitalizeFirstLetterOfUnion(entity)]
					}
				});
			},
			{
				response: Schemes[`${capitalizeFirstLetterOfUnion(entity)}Plain`]
			}
		);
	}
}
