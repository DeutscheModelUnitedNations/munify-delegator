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
import { m } from '#lib/paraglide/messages';
import { z } from 'zod';
import { scanUserForDuplicatesInBackground } from '#api/handlers/possibleDuplicate/possibleDuplicateService';

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
	// how many conferences they took part in may have changed
	userPubsub.updated(userId);
}

type ProfileAddress = {
	countryCode: string;
	streetAddress: string;
	postalCode?: string | null;
	locality?: string | null;
	region?: string | null;
};

/** The address columns an address argument writes; none when it is left out. */
function addressColumns({
	address,
	ctx
}: {
	address: ProfileAddress | null | undefined;
	ctx: z.RefinementCtx;
}) {
	if (!address) return {};
	const country = alpha2ToAlpha3(address.countryCode);
	if (!country) {
		ctx.addIssue({
			code: 'custom',
			path: ['address'],
			message: m.userUnknownCountry({ country: address.countryCode })
		});
		return {};
	}
	return {
		street: address.streetAddress,
		zip: address.postalCode ?? null,
		city: address.locality ?? null,
		region: address.region ?? null,
		country
	};
}

/** Adds the issues the profile forms' rules (`userUpdateSchema`) find in the given columns. */
function judgeByProfileRules({
	changes: { givenName, familyName, ...rest },
	ctx
}: {
	changes: { givenName?: string; familyName?: string } & Record<string, unknown>;
	ctx: z.RefinementCtx;
}) {
	const judged = userUpdateSchema.safeParse({
		given_name: givenName,
		family_name: familyName,
		...rest
	});
	for (const issue of judged.error?.issues ?? []) {
		ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
	}
}

/** A column of the user table that is never null: `null` leaves it as it is, like undefined. */
const keep = <T extends z.ZodType>(value: T) =>
	value.nullish().transform((given) => given ?? undefined);

/**
 * The arguments of `updateUser` as rumble's scalars hand them over (names, the phone number as
 * E.164, the address checked against the country's postal metadata), turned into the columns they
 * write. A field left out stays as it is; `null` clears the apartment or the pronouns and leaves
 * every field a profile always has as it is. The fields given are then judged by the rules the
 * profile forms use (`userUpdateSchema`).
 */
export const profileArgsSchema = z
	.object({
		id: z.string(),
		givenName: keep(z.string()),
		familyName: keep(z.string()),
		birthday: keep(z.date()),
		phone: z.object({ number: z.string() }).nullish(),
		/** Always whole: the country decides which of the other parts it needs. */
		address: z
			.object({
				countryCode: z.string(),
				streetAddress: z.string(),
				postalCode: z.string().nullish(),
				locality: z.string().nullish(),
				region: z.string().nullish()
			})
			.nullish(),
		apartment: z.string().nullish(),
		gender: keep(z.enum(schema.gender.enumValues)),
		pronouns: z.string().nullish(),
		foodPreference: keep(z.enum(schema.foodPreference.enumValues)),
		emergencyContacts: keep(z.string()),
		wantsToReceiveGeneralInformation: keep(z.boolean()),
		wantsJoinTeamInformation: keep(z.boolean())
	})
	.transform(({ id, phone, address, ...fields }, ctx) => {
		const changes = { ...fields, phone: phone?.number, ...addressColumns({ address, ctx }) };
		judgeByProfileRules({ changes, ctx });
		return { id, changes };
	});

export type ProfileUpdate = z.output<typeof profileArgsSchema>;

/**
 * Writes the given profile fields of user `id`, already checked (`profileArgsSchema`), and looks
 * for accounts from before that the changed profile may now resemble.
 */
export async function updateProfile({ id, changes }: ProfileUpdate) {
	await db
		.update(schema.user)
		.set({ ...changes, updatedAt: new Date() })
		.where(whereRows({ table: schema.user, filter: { id } }));
	userPubsub.updated(id);
	scanUserForDuplicatesInBackground(id);
}

/** Replaces the care team's notes about user `id`. */
export async function setGlobalNotes({ id, globalNotes }: { id: string; globalNotes: string }) {
	await db
		.update(schema.user)
		.set({ globalNotes })
		.where(whereRows({ table: schema.user, filter: { id } }));
	userPubsub.updated(id);
}

/**
 * Name and birthday corrections by the care team; an absent field is left as it is. Looks for
 * accounts from before that the corrected identity may now resemble.
 */
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
	scanUserForDuplicatesInBackground(id);
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
