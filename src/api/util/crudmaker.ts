import { permissionsPlugin } from '$api/auth/permissions';
import { db } from '$db/db';
import * as Schemes from '$db/generated/schema/barrel';
import Elysia, { t } from 'elysia';

type OmitDollarPrefixed<T> = T extends `$${string}` ? never : T;
type OmitSymbol<T> = T extends symbol ? never : T;
type AllEntityNames = OmitSymbol<OmitDollarPrefixed<keyof typeof db>>;

function capitalizeFirstLetterOfUnion<T extends AllEntityNames>(input: T): Capitalize<T> {
	return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}

const c = new Elysia().use(permissionsPlugin);
type GETParams = Parameters<typeof c.get()>[1];
type POSTParams = Parameters<typeof c.post>[1];
type PATCHParams = Parameters<typeof c.patch>[1];
type DELETEParams = Parameters<typeof c.delete>[1];

//TODO test this

export function makeCRUD<EntityName extends AllEntityNames<typeof db>>(
	entity: EntityName,
	customHandlers?: {
		getAll?: (context: GETParams) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>[];
		getOne?: (context: GETParams) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		createOne?: (
			context: {
				body: Static<(typeof Schemes)[`${Capitalize<EntityName>}PlainInput`]>;
			} & POSTParams
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		updateOne?: (
			context: {
				body: Static<(typeof Schemes)[`${Capitalize<EntityName>}PlainInput`]>;
			} & PATCHParams
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		deleteOne?: (
			context: {
				query: Static<(typeof Schemes)[`${Capitalize<EntityName>}WhereUnique`]>;
			} & DELETEParams
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
	}
) {
	const capitalizedEntityName = capitalizeFirstLetterOfUnion(entity);

	return new Elysia()
		.use(permissionsPlugin)
		.get(
			`/${entity}`,
			async ({ permissions }) => {
				// @ts-ignore
				return await db[entity].findMany({
					where: permissions.allowDatabaseAccessTo('list')[capitalizeFirstLetterOfUnion(entity)]
				});
			},
			{
				response: t.Array(Schemes[`${cpaitalizedEntity}Plain`])
			}
		)
		.get(
			`/${entity}/:id`,
			customHandlers?.getOne ??
				(async ({ permissions, params }) => {
					// @ts-ignore
					return await db[entity].findUniqueOrThrow({
						where: {
							id: params.id,
							AND: permissions.allowDatabaseAccessTo('read')[capitalizeFirstLetterOfUnion(entity)]
						}
					});
				}),
			{
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.post(
			`/${entity}`,
			customHandlers?.createOne ??
				(async ({ permissions, body }) => {
					permissions.checkIf((user) => user.can('create', capitalizeFirstLetterOfUnion(entity)));
					// @ts-ignore
					return await db[entity].create({
						data: body
					});
				}),
			{
				body: Schemes[`${cpaitalizedEntity}InputCreate`],
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.patch(
			`/${entity}/:id`,
			customHandlers?.updateOne ??
				(async ({ permissions, params, body }) => {
					// @ts-ignore
					return await db[entity].update({
						where: {
							id: params.id,
							AND: permissions.allowDatabaseAccessTo('update')[capitalizeFirstLetterOfUnion(entity)]
						},
						data: body
					});
				}),
			{
				body: Schemes[`${cpaitalizedEntity}InputUpdate`],
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.delete(
			`/${entity}/:id`,
			async ({ permissions, params }) =>
				{
					// @ts-ignore
					return await db[entity].delete({
						where: {
							id: params.id,
							AND: permissions.allowDatabaseAccessTo('delete')[capitalizeFirstLetterOfUnion(entity)]
						}
					});
				},
			{
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		);
}
