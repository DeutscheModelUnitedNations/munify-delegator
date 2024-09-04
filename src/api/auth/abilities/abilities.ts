import { type PureAbility, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, type PrismaQuery } from '@casl/prisma';
import { dynamicPrivateConfig } from '$config/private';
import type { OIDCDeriveType } from '../oidc';
import type { db } from '$db/db';
import { defineAbilitiesForConference } from './entities/conference';
import { defineAbilitiesForUserEntity } from './entities/user';
import { defineAbilitiesForDelegationEntity } from './entities/delegation';
import type { Capitalize } from '@sinclair/typebox';
import { defineAbilitiesForDelegationMemberEntity } from './entities/delegationMember';

const actions = ['list', 'create', 'read', 'update', 'delete', 'join'] as const;

/**
 * Actions which can be run on entities in the system:
 *
 * - `list`: List all entities of a type
 * - `read`: Read a single entity
 * - `create`: Create a new entity
 * - `update`: Update an entity
 * - `status-update`: Update the status of an entity (non critical data, such as state of debate for committees)
 * - `delete`: Delete an entity
 */
export type Action = (typeof actions)[number];

type WithTypename<T extends object, TName extends string> = T & {
	__typename: TName;
};
type TaggedSubjects<T extends Record<string, Record<string, unknown>>> =
	| keyof T
	| { [K in keyof T]: WithTypename<T[K], K & string> }[keyof T];

type OmitDollarPrefixed<T> = T extends `$${string}` ? never : T;
type OmitSymbol<T> = T extends symbol ? never : T;
export type AllEntityNames = OmitSymbol<OmitDollarPrefixed<keyof typeof db>>;

export type AppAbility = PureAbility<
	[
		Action,
		TaggedSubjects<{
			[K in AllEntityNames as Capitalize<K>]: Awaited<
				ReturnType<(typeof db)[K]['findUniqueOrThrow']>
			>;
		}>
	],
	PrismaQuery
>;

export const defineAbilitiesForUser = (oidc: OIDCDeriveType) => {
	const builder = new AbilityBuilder<AppAbility>(createPrismaAbility);

	if (dynamicPrivateConfig.NODE_ENV !== 'production' && oidc && oidc.user) {
		console.info('Development mode: granting all permissions');
		// https://casl.js.org/v6/en/guide/intro#basics
		builder.can('manage' as any, 'all' as any);
	}

	defineAbilitiesForConference(oidc, builder);
	defineAbilitiesForUserEntity(oidc, builder);
	defineAbilitiesForDelegationEntity(oidc, builder);
	defineAbilitiesForDelegationMemberEntity(oidc, builder);

	return builder.build({
		detectSubjectType: (object) => object.__typename
	});
};
