import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	singleParticipantPubsub,
	userPubsub
} from '#api/pubsub';
import { alpha2ToAlpha3 } from '#lib/helpers/countryCodes';
import { and, count, eq, isNotNull, notExists, sql, type SQL } from 'drizzle-orm';
import { userUpdateSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { apiError } from '#api/services/errors';
import { nullToUndefined } from '#api/services/args';
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
export async function removeParticipation({
	userId,
	conferenceId,
	deletable
}: {
	userId: string;
	conferenceId: string;
	deletable: DeletableParticipation;
}) {
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
			throw apiError({ code: 'NOT_FOUND', message: m.userNotFound() });
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
	delegationMemberPubsub.removed();
	singleParticipantPubsub.removed();
	conferenceSupervisorPubsub.removed();
	conferenceParticipantPubsub.removed();
}

/**
 * What the profile forms submit, as the mutation receives it. A field left out (or `null`, for
 * one the profile always has) stays as it is.
 */
export type ProfileUpdate = {
	id: string;
	givenName?: string | null;
	familyName?: string | null;
	birthday?: Date | null;
	phone?: { number: string } | null;
	/** Always whole: the country decides which of the other parts it needs. */
	address?: {
		countryCode: string;
		streetAddress: string;
		postalCode?: string | null;
		locality?: string | null;
		region?: string | null;
	} | null;
	/** `null` clears it. */
	apartment?: string | null;
	gender?: (typeof schema.user.$inferInsert)['gender'] | null;
	/** `null` clears it. */
	pronouns?: string | null;
	foodPreference?: (typeof schema.user.$inferInsert)['foodPreference'] | null;
	emergencyContacts?: string | null;
	wantsToReceiveGeneralInformation?: boolean | null;
	wantsJoinTeamInformation?: boolean | null;
};

/** The address columns of an address input, or `undefined` when it names none. */
function addressColumns(address: ProfileUpdate['address']) {
	if (!address) return undefined;
	const country = alpha2ToAlpha3(address.countryCode);
	if (!country)
		throw apiError({
			code: 'INVALID_INPUT',
			message: m.userUnknownCountry({ country: address.countryCode })
		});
	return {
		street: address.streetAddress,
		zip: address.postalCode ?? null,
		city: address.locality ?? null,
		region: address.region ?? null,
		country
	};
}

/**
 * The my-account form and the user card's. rumble's scalars normalize what they can; the same
 * zod rules the form uses then judge the fields given. Writes only those, and only to the row
 * `updatable` (pre-authorized) matches.
 */
export async function updateProfile({
	args,
	updatable
}: {
	args: ProfileUpdate;
	updatable: SQL | undefined;
}) {
	const changes = {
		givenName: nullToUndefined(args.givenName),
		familyName: nullToUndefined(args.familyName),
		birthday: nullToUndefined(args.birthday),
		phone: args.phone?.number,
		...addressColumns(args.address),
		apartment: args.apartment,
		gender: nullToUndefined(args.gender),
		pronouns: args.pronouns,
		foodPreference: nullToUndefined(args.foodPreference),
		emergencyContacts: nullToUndefined(args.emergencyContacts),
		wantsToReceiveGeneralInformation: nullToUndefined(args.wantsToReceiveGeneralInformation),
		wantsJoinTeamInformation: nullToUndefined(args.wantsJoinTeamInformation)
	};

	const { givenName, familyName, ...rest } = changes;
	userUpdateSchema.parse({ given_name: givenName, family_name: familyName, ...rest });

	await db
		.update(schema.user)
		.set({ ...changes, updatedAt: new Date() })
		.where(updatable);
	userPubsub.updated(args.id);
}

/** Name and birthday corrections by management; an absent field is left as it is. */
export async function updateIdentity({
	id,
	args
}: {
	id: string;
	args: { givenName?: string | null; familyName?: string | null; birthday?: Date | null };
}) {
	await db
		.update(schema.user)
		.set({
			givenName: args.givenName ?? undefined,
			familyName: args.familyName ?? undefined,
			birthday: args.birthday ?? undefined
		})
		.where(whereRows({ table: schema.user, filter: { id } }));
	userPubsub.updated(id);
}

/** Newsletter opt-ins, addressed by email rather than id. */
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

	for (const { id } of updated) userPubsub.updated(id);
}
