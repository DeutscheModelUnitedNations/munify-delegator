import { db, schema } from '#api/db/db';
import { alpha2ToAlpha3 } from '#lib/helpers/countryCodes';
import { and, count, eq, isNotNull, notExists, sql, type SQL } from 'drizzle-orm';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { apiError } from '#api/services/errors/apiError';
import { m } from '#lib/paraglide/messages';

/**
 * How many conferences this person actually took part in - registrations that never got a
 * seat do not count.
 */
export async function countConferenceParticipations(userId: string) {
	const { delegation, delegationMember, singleParticipant, conferenceParticipant } = schema;
	const [[memberships], [participations]] = await Promise.all([
		db
			.select({ value: count() })
			.from(delegationMember)
			.innerJoin(
				conferenceParticipant,
				eq(conferenceParticipant.id, delegationMember.conferenceParticipantId)
			)
			.innerJoin(delegation, eq(delegation.id, delegationMember.delegationId))
			.where(and(eq(conferenceParticipant.userId, userId), isNotNull(delegation.assignedRoleId))),
		db
			.select({ value: count() })
			.from(singleParticipant)
			.innerJoin(
				conferenceParticipant,
				eq(conferenceParticipant.id, singleParticipant.conferenceParticipantId)
			)
			.where(
				and(eq(conferenceParticipant.userId, userId), isNotNull(singleParticipant.assignedRoleId))
			)
	]);

	return (memberships?.value ?? 0) + (participations?.value ?? 0);
}

/** Where-clauses, one per table, that say which participation rows the caller may delete. */
export type DeletableParticipation = {
	delegationMember: SQL | undefined;
	singleParticipant: SQL | undefined;
	conferenceSupervisor: SQL | undefined;
	conferenceParticipant: SQL | undefined;
};

/**
 * Removes every trace of a user's participation in one conference - delegation membership,
 * single participant entry, supervisor entry and participant status - while leaving the user
 * account itself alone. Only the rows `deletable` (pre-authorized) matches are removed.
 */
export async function removeParticipation(
	userId: string,
	conferenceId: string,
	deletable: DeletableParticipation
) {
	await db.transaction(async (tx) => {
		const participant = await tx.query.user.findFirst({
			where: {
				id: userId,
				OR: [
					{ delegationMemberships: { participant: { conferenceId } } },
					{ singleParticipant: { participant: { conferenceId } } },
					{ conferenceSupervisor: { participant: { conferenceId } } }
				]
			},
			columns: { id: true }
		});

		if (!participant) {
			throw apiError('NOT_FOUND', m.userNotFound());
		}

		await tx.delete(schema.delegationMember).where(deletable.delegationMember);
		await tx.delete(schema.singleParticipant).where(deletable.singleParticipant);
		await tx.delete(schema.conferenceSupervisor).where(deletable.conferenceSupervisor);
		// The person's row goes too, unless papers or payments still name them: those stay the
		// conference's record, and the row with them (as it does after leaving a delegation).
		await tx
			.delete(schema.conferenceParticipant)
			.where(
				and(
					deletable.conferenceParticipant,
					notExists(
						tx
							.select({ id: schema.paper.id })
							.from(schema.paper)
							.where(eq(schema.paper.authorParticipantId, schema.conferenceParticipant.id))
					),
					notExists(
						tx
							.select({ id: schema.paymentTransaction.id })
							.from(schema.paymentTransaction)
							.where(
								eq(schema.paymentTransaction.payerParticipantId, schema.conferenceParticipant.id)
							)
					)
				)
			);
	});
}

/** What the self-service profile form submits, as the mutation receives it. */
export type ProfileUpdate = {
	id: string;
	givenName: string;
	familyName: string;
	birthday: Date;
	phone: { number: string };
	address: {
		countryCode: string;
		streetAddress: string;
		postalCode?: string | null;
		locality?: string | null;
		region?: string | null;
	};
	apartment?: string | null;
	gender: (typeof schema.user.$inferInsert)['gender'];
	pronouns?: string | null;
	foodPreference: (typeof schema.user.$inferInsert)['foodPreference'];
	emergencyContacts: string;
	wantsToReceiveGeneralInformation?: boolean | null;
	wantsJoinTeamInformation?: boolean | null;
};

/**
 * The my-account form and the user card's. rumble's scalars normalize what they can; the same
 * zod schema the form uses then judges the rest. Writes only the row `updatable` (pre-authorized)
 * matches.
 */
export async function updateProfile(args: ProfileUpdate, updatable: SQL | undefined) {
	const country = alpha2ToAlpha3(args.address.countryCode);
	if (!country)
		throw apiError('INVALID_INPUT', m.userUnknownCountry({ country: args.address.countryCode }));
	const address = {
		street: args.address.streetAddress,
		zip: args.address.postalCode ?? null,
		city: args.address.locality ?? null,
		region: args.address.region ?? null,
		country
	};
	const phone = args.phone.number;

	userFormSchema.parse({
		given_name: args.givenName,
		family_name: args.familyName,
		birthday: args.birthday,
		phone,
		...address,
		apartment: args.apartment,
		gender: args.gender,
		pronouns: args.pronouns,
		foodPreference: args.foodPreference,
		emergencyContacts: args.emergencyContacts,
		wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation,
		wantsJoinTeamInformation: args.wantsJoinTeamInformation
	});

	await db
		.update(schema.user)
		.set({
			givenName: args.givenName,
			familyName: args.familyName,
			birthday: args.birthday,
			phone,
			...address,
			apartment: args.apartment ?? null,
			gender: args.gender,
			pronouns: args.pronouns ?? null,
			foodPreference: args.foodPreference,
			emergencyContacts: args.emergencyContacts,
			wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
			wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
		})
		.where(updatable);
}

/** Name and birthday corrections by management; an absent field is left as it is. */
export async function updateIdentity(
	id: string,
	args: { givenName?: string | null; familyName?: string | null; birthday?: Date | null }
) {
	await db
		.update(schema.user)
		.set({
			givenName: args.givenName ?? undefined,
			familyName: args.familyName ?? undefined,
			birthday: args.birthday ?? undefined
		})
		.where(eq(schema.user.id, id));
}

/**
 * Newsletter opt-ins, addressed by email rather than id. Returns the ids of the rows that changed.
 */
export async function updateNewsletterPreferences(args: {
	email: string;
	wantsToReceiveGeneralInformation?: boolean | null;
	wantsJoinTeamInformation?: boolean | null;
}) {
	const updated = await db
		.update(schema.user)
		.set({
			wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
			wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
		})
		// the scalar lowercases; addresses stored before it did may still carry capitals
		.where(sql`lower(${schema.user.email}) = ${args.email}`)
		.returning({ id: schema.user.id });

	return updated.map(({ id }) => id);
}
