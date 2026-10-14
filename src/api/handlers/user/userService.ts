import { db, schema } from '$api/db/db';
import type { Context } from '$api/context';
import type { ApiContext } from '$api/rumble';
import { PARTICIPANT_CARE_ROLES, isManagedUser, isSystemAdmin } from '$api/services/authHelper';
import { isUniqueViolationOn } from '$api/services/account/emailConflict';
import { reportEmailConflict } from '$api/services/account/reportEmailConflict';
import { PUBLIC_DEFAULT_LOCALE } from '$app/env/public';
import { alpha2ToAlpha3 } from '$lib/helpers/countryCodes';
import { assertFindFirstExists } from '@m1212e/rumble';
import { and, count, eq, isNotNull, or, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';

/** Refuses unless the caller looks after this user - the care team's edits, not self-service. */
export async function assertManagesUser(ctx: Context, id: string) {
	ctx.mustBeLoggedIn();
	const managed = isManagedUser(ctx);
	const found = managed
		? await db.query.user.findFirst({ where: { id, ...managed }, columns: { id: true } })
		: undefined;
	if (!found) {
		throw new GraphQLError('User not found, or not one you look after');
	}
}

/**
 * How many conferences this person actually took part in - registrations that never got a
 * seat do not count.
 */
export async function countConferenceParticipations(userId: string) {
	const { delegation, delegationMember, singleParticipant } = schema;
	const [[memberships], participations] = await Promise.all([
		db
			.select({ value: count() })
			.from(delegationMember)
			.innerJoin(delegation, eq(delegation.id, delegationMember.delegationId))
			.where(
				and(
					eq(delegationMember.userId, userId),
					or(
						isNotNull(delegation.assignedNationAlpha3Code),
						isNotNull(delegation.assignedNonStateActorId)
					)
				)
			),
		db.$count(
			singleParticipant,
			and(eq(singleParticipant.userId, userId), isNotNull(singleParticipant.assignedRoleId))
		)
	]);

	return (memberships?.value ?? 0) + participations;
}

/**
 * Removes every trace of a user's participation in one conference - delegation membership,
 * single participant entry, supervisor entry and participant status - while leaving the user
 * account itself alone. Each delete carries its own ability filter, so a caller who may remove
 * one kind of participation but not another removes only what they are allowed to.
 */
export async function removeParticipation(ctx: ApiContext, userId: string, conferenceId: string) {
	const scope = { conferenceId, userId };

	await db.transaction(async (tx) => {
		const participant = await tx.query.user.findFirst({
			where: {
				id: userId,
				OR: [
					{ delegationMemberships: { conferenceId } },
					{ singleParticipant: { conferenceId } },
					{ conferenceSupervisor: { conferenceId } }
				]
			},
			columns: { id: true }
		});

		if (!participant) {
			throw new GraphQLError('User not found');
		}

		// Each delete carries its own ability filter, merged with the conference/user scope, so
		// a caller who may remove one kind of participation but not another removes only what
		// they are allowed to.
		await tx
			.delete(schema.delegationMember)
			.where(
				(await ctx.abilities.delegationMember.filter('delete')).merge({ where: scope }).sql.where
			);

		await tx
			.delete(schema.singleParticipant)
			.where(
				(await ctx.abilities.singleParticipant.filter('delete')).merge({ where: scope }).sql.where
			);

		await tx
			.delete(schema.conferenceSupervisor)
			.where(
				(await ctx.abilities.conferenceSupervisor.filter('delete')).merge({ where: scope }).sql
					.where
			);

		await tx.delete(schema.conferenceParticipantStatus).where(
			(await ctx.abilities.conferenceParticipantStatus.filter('delete')).merge({
				where: scope
			}).sql.where
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
 * zod schema the form uses then judges the rest.
 */
export async function updateProfile(ctx: ApiContext, args: ProfileUpdate) {
	const country = alpha2ToAlpha3(args.address.countryCode);
	if (!country) throw new GraphQLError(`Unknown country ${args.address.countryCode}`);
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
		.where((await ctx.abilities.user.filter('update')).merge({ where: { id: args.id } }).sql.where);
}

/**
 * Newsletter opt-ins, addressed by email rather than id. Opting in is consent, so only the
 * account itself may give it. Returns the ids of the rows that changed.
 */
export async function updateNewsletterPreferences(
	ctx: Context,
	args: {
		email: string;
		wantsToReceiveGeneralInformation?: boolean | null;
		wantsJoinTeamInformation?: boolean | null;
	}
) {
	const optsIn = args.wantsToReceiveGeneralInformation || args.wantsJoinTeamInformation;
	if (optsIn && ctx.oidc.user?.email?.toLowerCase() !== args.email) {
		throw new GraphQLError('Only the account itself may subscribe to the newsletter');
	}

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

/** Enough of an address to recognise it in a log without writing the whole thing down. */
function maskEmail(email: string): string {
	const [localPart, domain] = email.split('@');
	if (!localPart || !domain) {
		return '***@***';
	}
	if (localPart.length <= 2) {
		return `${localPart[0]}***@${domain}`;
	}
	return `${localPart.slice(0, 2)}***@${domain}`;
}

/** Answers an email conflict on the mutation with an error the frontend can tell apart. */
async function throwEmailConflict(
	userSubject: string,
	email: string,
	error: unknown
): Promise<never> {
	const conflict = await reportEmailConflict(userSubject, email, error, maskEmail);

	throw new GraphQLError('Email address is already in use by another account', {
		extensions: {
			code: 'EMAIL_CONFLICT',
			isNewUser: conflict.isNewUser,
			maskedConflictingEmail: conflict.maskedConflictingEmail,
			maskedExistingEmail: conflict.maskedExistingEmail,
			refId: conflict.refId
		}
	});
}

/** The claims the caller's own row is written from; an account without an email cannot have one. */
function selfClaims(caller: ReturnType<Context['mustBeLoggedIn']>) {
	if (!caller.email) {
		throw new GraphQLError('OIDC result is missing required field: email');
	}
	return { email: caller.email, locale: caller.locale ?? PUBLIC_DEFAULT_LOCALE };
}

/**
 * Creates or refreshes the caller's own row from their OIDC claims. Called right after login,
 * which is the only moment the app learns about a new account.
 */
export async function upsertCallerRow(ctx: Context) {
	const caller = ctx.mustBeLoggedIn();
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

/** Participant care, project management (of any conference) and admins may look users up. */
async function assertMayPreviewUsers(ctx: Context) {
	const caller = ctx.mustBeLoggedIn();
	if (isSystemAdmin(ctx)) return;

	const privileged = await db.query.teamMember.findFirst({
		where: { userId: caller.sub, role: { in: [...PARTICIPANT_CARE_ROLES] } }
	});
	if (!privileged) {
		throw new GraphQLError(
			'You are not allowed to preview users. You need to be a team member with the role PARTICIPANT_CARE or PROJECT_MANAGEMENT or an admin.'
		);
	}
}

/**
 * Looks a user up by id or email so management can add them to something. Not ability-filtered
 * on the target, so the check is on the caller instead.
 */
export async function previewUser(ctx: Context, emailOrId: string) {
	await assertMayPreviewUsers(ctx);

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
