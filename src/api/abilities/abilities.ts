import { type PureAbility, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, type PrismaQuery } from '@casl/prisma';
import type { db } from '$db/db';
import { defineAbilitiesForConference } from './entities/conference';
import { defineAbilitiesForDelegation } from './entities/delegation';
import { defineAbilitiesForDelegationMember } from './entities/delegationMember';
import { defineAbilitiesForCommittee } from './entities/committee';
import { defineAbilitiesForConferenceParticipantStatus } from './entities/conferenceParticipantStatus';
import { defineAbilitiesForConferenceSupervisor } from './entities/conferenceSupervisor';
import { defineAbilitiesForCustomConferenceRole } from './entities/customConferenceRole';
import { defineAbilitiesForNation } from './entities/nation';
import { defineAbilitiesForNonStateActor } from './entities/nonStateActor';
import { defineAbilitiesForRoleApplication } from './entities/roleApplication';
import { defineAbilitiesForSingleParticipant } from './entities/singleParticipant';
import { defineAbilitiesForTeamMember } from './entities/teamMember';
import { defineAbilitiesForUserEntity } from './entities/user';
import type { OIDC } from '$api/context/oidc';
import { defineAbilitiesForPaymentTransaction } from './entities/paymentTransaction';
import { defineAbilitiesForSurveyQuestion } from './entities/surveyQuestion';
import { defineAbilitiesForSurveyAnswer } from './entities/surveyAnswer';
import { defineAbilitiesForSurveyOption } from './entities/surveyOption';
import { defineAbilitiesForCommitteeAgendaItem } from './entities/committeeAgendaItem';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const actions = ['list', 'read', 'update', 'delete'] as const;

/**
 * Actions which can be run on entities in the system:
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

export const defineAbilitiesForUser = (oidc: OIDC) => {
	const builder = new AbilityBuilder<AppAbility>(createPrismaAbility);

	// TODO you can enable this to test requests without permission checks
	// if (configPrivate.NODE_ENV !== 'production' && oidc && oidc.user) {
	// 	console.info('Development mode: granting all permissions');
	// 	// https://casl.js.org/v6/en/guide/intro#basics
	// 	builder.can('manage' as any, 'all' as any);
	// }

	// grant system wide admins all permissions
	if (oidc && oidc.user && oidc.user.hasRole('admin')) {
		console.info('Admin granted: ', oidc.user.preferred_username);
		builder.can('manage' as any, 'all' as any);
	}

	defineAbilitiesForCommittee(oidc, builder);
	defineAbilitiesForCommitteeAgendaItem(oidc, builder);
	defineAbilitiesForConference(oidc, builder);
	defineAbilitiesForConferenceParticipantStatus(oidc, builder);
	defineAbilitiesForConferenceSupervisor(oidc, builder);
	defineAbilitiesForCustomConferenceRole(oidc, builder);
	defineAbilitiesForDelegation(oidc, builder);
	defineAbilitiesForDelegationMember(oidc, builder);
	defineAbilitiesForNation(oidc, builder);
	defineAbilitiesForNonStateActor(oidc, builder);
	defineAbilitiesForPaymentTransaction(oidc, builder);
	defineAbilitiesForRoleApplication(oidc, builder);
	defineAbilitiesForSingleParticipant(oidc, builder);
	defineAbilitiesForTeamMember(oidc, builder);
	defineAbilitiesForUserEntity(oidc, builder);
	defineAbilitiesForSurveyQuestion(oidc, builder);
	defineAbilitiesForSurveyOption(oidc, builder);
	defineAbilitiesForSurveyAnswer(oidc, builder);

	return builder.build({
		detectSubjectType: (object) => object.__typename
	});
};
