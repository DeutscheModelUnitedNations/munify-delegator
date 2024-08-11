import { permissionsPlugin } from '$api/auth/permissions';
import { db } from '$db/db';
import * as Schemes from '$db/generated/schema/barrel';
import Elysia, { t, type Static } from 'elysia';

type OmitDollarPrefixed<T> = T extends `$${string}` ? never : T;
type OmitSymbol<T> = T extends symbol ? never : T;
type AllEntityNames<T> = OmitSymbol<OmitDollarPrefixed<keyof T>>;

function capitalizeFirstLetterOfUnion<T extends AllEntityNames<typeof db>>(
	input: T
): Capitalize<T> {
	return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}

//TODO test this

export function makeCRUD<EntityName extends AllEntityNames<typeof db>>(
	entity: EntityName,
	customHandlers?: {
		getAll?: () => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>[];
		getOne?: () => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		createOne?: (
			input: Static<(typeof Schemes)[`${Capitalize<EntityName>}PlainInput`]>
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		updateOne?: (
			input: Static<(typeof Schemes)[`${Capitalize<EntityName>}PlainInput`]>
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
		deleteOne?: (
			input: Static<(typeof Schemes)[`${Capitalize<EntityName>}WhereUnique`]>
		) => Static<(typeof Schemes)[`${Capitalize<EntityName>}Plain`]>;
	}
) {
	const capitalizedEntityName = capitalizeFirstLetterOfUnion(entity);

	return new Elysia()
		.use(permissionsPlugin)
		.get(
			`/${entity}`,
			customHandlers?.getAll ??
				(async ({ permissions }) => {
					// @ts-ignore
					return await db[entity].findMany({
						where: permissions.allowDatabaseAccessTo('list')[capitalizeFirstLetterOfUnion(entity)]
					});
				}),
			{
				response: t.Array(Schemes[`${capitalizedEntityName}Plain`])
			}
		)
		.get(
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
				response: Schemes[`${capitalizedEntityName}Plain`]
			}
		)
		.use(permissionsPlugin)
		.post(
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
		)
		.use(permissionsPlugin)
		.patch(
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
		)
		.use(permissionsPlugin)
		.delete(
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
				response: Schemes[`${capitalizedEntityName}Plain`]
			}
		);
}
