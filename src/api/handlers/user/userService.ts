import { db, schema } from '#api/db/db';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	singleParticipantPubsub,
	userPubsub
} from '#api/pubsub';
import { alpha2ToAlpha3 } from '#lib/helpers/countryCodes';
import { and, count, eq, isNotNull, notExists, sql, type SQL } from 'drizzle-orm';
import { userUpdateSchema } from '#lib/schemata/userForm';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { z } from 'zod';

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

/** A pre-authorized `where`; one that is missing matches nothing rather than every row. */
const onlyWhere = (where: SQL | undefined) => where ?? sql`false`;

/**
 * Removes every trace of a user's participation in one conference - delegation membership,
 * single participant entry, supervisor entry and participant status - while leaving the user
 * account itself alone. Only the rows `deletable` (pre-authorized) matches are removed. Refuses
 * (NOT_FOUND) when the user takes no part in the conference, or none of their registrations is
 * among the rows `deletable` matches.
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

		const registrations = [
			await tx
				.delete(schema.delegationMember)
				.where(onlyWhere(deletable.delegationMember))
				.returning({ id: schema.delegationMember.id }),
			await tx
				.delete(schema.singleParticipant)
				.where(onlyWhere(deletable.singleParticipant))
				.returning({ id: schema.singleParticipant.id }),
			await tx
				.delete(schema.conferenceSupervisor)
				.where(onlyWhere(deletable.conferenceSupervisor))
				.returning({ id: schema.conferenceSupervisor.id })
		];
		if (registrations.every((removed) => removed.length === 0)) {
			throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
		}
		// The person's row goes too, unless papers or payments still name them: those stay the
		// conference's record, and the row with them (as it does after leaving a delegation).
		await tx
			.delete(schema.conferenceParticipant)
			.where(
				and(
					onlyWhere(deletable.conferenceParticipant),
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

/** The user columns the mutations write; each is left as it is when undefined. */
export type UserChanges = Partial<
	Omit<typeof schema.user.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * Writes the given columns to the rows `where` (pre-authorized) matches. What the mutations hand
 * over was checked with their arguments (`profileArgsSchema` for a profile).
 */
export async function updateUser({
	where,
	changes
}: {
	where: SQL | undefined;
	changes: UserChanges;
}) {
	const updated = await db
		.update(schema.user)
		.set({ ...changes, updatedAt: new Date() })
		.where(where)
		.returning({ id: schema.user.id });
	for (const { id } of updated) userPubsub.updated(id);
}
