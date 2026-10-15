import { db, schema } from '$api/db/db';
import type { Context } from '$api/context';
import { emailConflictError, reportEmailConflict } from '$api/services/account/emailConflict';
import { isUniqueViolationOn } from '$api/services/errors/uniqueViolation';
import { PUBLIC_DEFAULT_LOCALE } from '$app/env/public';
import { alpha2ToAlpha3 } from '$lib/helpers/countryCodes';
import { assertFindFirstExists } from '@m1212e/rumble';
import { and, count, eq, isNotNull, notExists, sql, type SQL } from 'drizzle-orm';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { apiError } from '$api/services/errors/apiError';
import { m } from '$lib/paraglide/messages';

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

/** Answers an email conflict on the mutation with an error the frontend can tell apart. */
async function throwEmailConflict(
	userSubject: string,
	email: string,
	error: unknown
): Promise<never> {
	const conflict = await reportEmailConflict(userSubject, email, error);
	throw emailConflictError(conflict);
}

/** The signed-in caller, as the request context knows them. */
type Caller = ReturnType<Context['mustBeLoggedIn']>;

/** The claims the caller's own row is written from; an account without an email cannot have one. */
function selfClaims(caller: Caller) {
	if (!caller.email) {
		throw apiError('INVALID_INPUT', m.userEmailMissingFromProvider());
	}
	return { email: caller.email, locale: caller.locale ?? PUBLIC_DEFAULT_LOCALE };
}

/**
 * Creates or refreshes the caller's own row from their OIDC claims. Called right after login,
 * which is the only moment the app learns about a new account.
 */
export async function upsertCallerRow(caller: Caller) {
	const { email, locale } = selfClaims(caller);

	try {
		const [user] = await db
			.insert(schema.user)
			.values({
				id: caller.sub,
				email,
				familyName: '',
				givenName: '',
				preferredUsername: email,
				locale
			})
			.onConflictDoUpdate({ target: schema.user.id, set: { email, locale } })
			.returning();

		return {
			userNeedsAdditionalInfo: !userFormSchema.safeParse({
				...user,
				given_name: user.givenName,
				family_name: user.familyName
			}).success,
			userId: user.id
		};
	} catch (error) {
		if (!isUniqueViolationOn(error, 'email')) throw error;
		return throwEmailConflict(caller.sub, email, error);
	}
}

/**
 * Looks a user up by id or email so management can add them to something. Not ability-filtered
 * on the target, so the check is on the caller instead (`assertCanPreviewUsers`).
 */
export async function previewUser(emailOrId: string) {
	const found = await db.query.user
		.findFirst({ where: { OR: [{ id: emailOrId }, { email: emailOrId }] } })
		.then(assertFindFirstExists);

	return {
		id: found.id,
		email: found.email,
		given_name: found.givenName ?? null,
		family_name: found.familyName ?? null
	};
}
