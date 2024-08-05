import { type PureAbility, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, type PrismaQuery } from '@casl/prisma';
import { dynamicPrivateConfig } from '$config/private';
import type { OIDCDeriveType } from '../oidc';
import type { db } from '$db/db';
import { defineAbilitiesForConference } from './entities/conference';
import { defineAbilitiesForUserEntity } from './entities/user';

const actions = ['list', 'create', 'read', 'update', 'delete'] as const;

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

export type AppAbility = PureAbility<
	[
		Action,
		TaggedSubjects<{
			Conference: Awaited<ReturnType<(typeof db.conference)['findUniqueOrThrow']>>;
			User: Awaited<ReturnType<(typeof db.user)['findUniqueOrThrow']>>;
			Nation: Awaited<ReturnType<(typeof db.nation)['findUniqueOrThrow']>>;
			ConferenceNation: Awaited<ReturnType<(typeof db.conferenceNation)['findUniqueOrThrow']>>;
			NonStateActor: Awaited<ReturnType<(typeof db.nonStateActor)['findUniqueOrThrow']>>;
			ConferenceNonStateActor: Awaited<
				ReturnType<(typeof db.conferenceNonStateActor)['findUniqueOrThrow']>
			>;
			CustomConferenceRole: Awaited<
				ReturnType<(typeof db.customConferenceRole)['findUniqueOrThrow']>
			>;
			Delegation: Awaited<ReturnType<(typeof db.delegation)['findUniqueOrThrow']>>;
			DelegationMember: Awaited<ReturnType<(typeof db.delegationMember)['findUniqueOrThrow']>>;
			DelegationApplication: Awaited<
				ReturnType<(typeof db.delegationApplication)['findUniqueOrThrow']>
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

	return builder.build({
		detectSubjectType: (object) => object.__typename
	});
};
