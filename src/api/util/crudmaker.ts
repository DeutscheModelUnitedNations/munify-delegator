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

//TODO test this

export function makeCRUD<EntityName extends AllEntityNames>(entity: EntityName) {
	const cpaitalizedEntity = capitalizeFirstLetterOfUnion(entity);
	return new Elysia()
		.use(permissionsPlugin)
		.get(
			`/${entity}`,
			({ permissions }) =>
				// @ts-ignore
				db[entity].findMany({
					where: permissions.allowDatabaseAccessTo('list')[capitalizeFirstLetterOfUnion(entity)]
				}),
			{
				response: t.Array(Schemes[`${cpaitalizedEntity}Plain`])
			}
		)
		.get(
			`/${entity}/:id`,
			({ permissions, params }) =>
				// @ts-ignore
				db[entity].findUniqueOrThrow({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('read')[capitalizeFirstLetterOfUnion(entity)]
					}
				}),
			{
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.post(
			`/${entity}`,
			async ({ permissions, body }) => {
				permissions.checkIf((user) => user.can('create', capitalizeFirstLetterOfUnion(entity)));
				// @ts-ignore
				return db[entity].create({
					data: body
				});
			},
			{
				body: Schemes[`${cpaitalizedEntity}InputCreate`],
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.patch(
			`/${entity}/:id`,
			({ permissions, params, body }) =>
				// @ts-ignore
				db[entity].update({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('update')[capitalizeFirstLetterOfUnion(entity)]
					},
					data: body
				}),
			{
				body: Schemes[`${cpaitalizedEntity}InputUpdate`],
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		)
		.delete(
			`/${entity}/:id`,
			({ permissions, params }) =>
				// @ts-ignore
				db[entity].delete({
					where: {
						id: params.id,
						AND: permissions.allowDatabaseAccessTo('delete')[capitalizeFirstLetterOfUnion(entity)]
					}
				}),
			{
				response: Schemes[`${cpaitalizedEntity}Plain`]
			}
		);
}
