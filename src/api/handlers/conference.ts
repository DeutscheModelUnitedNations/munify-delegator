import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { isTeamMemberOf } from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { NationRef } from './nation';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { m } from '$lib/paraglide/messages';
import { isSystemAdmin } from '$api/services/authHelper';
import { enum_ } from '$api/rumble';
import { and, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import type { InferSelectModel } from 'drizzle-orm';
import { UserRef } from './user';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';

// Everyone can see which conferences exist and their details.
abilityBuilder.conference.allow('read');

// Update and delete are limited to the conference's own project management.
abilityBuilder.conference.allow(['update', 'delete']).when((ctx) => ({
	where: isTeamMemberOf(ctx, ['PROJECT_MANAGEMENT'])
}));

export const ConferenceRef = object({ table: 'conference' });

query({ table: 'conference' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Merges several spellings of a school name into one, across both delegations and single
	 * participants. Participants type their school by hand, so the same institution arrives in
	 * a dozen variations; this is the cleanup tool for that.
	 */
	normalizeSchoolsInConference: t.drizzleField({
		type: ConferenceRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			schoolsToMerge: t.arg.stringList({ required: true }),
			newSchoolName: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			if (args.schoolsToMerge.length > 0) {
				await db.transaction(async (tx) => {
					await tx
						.update(schema.delegation)
						.set({ school: args.newSchoolName })
						.where(
							and(
								ctx.abilities.delegation
									.filter('update')
									.merge({ where: { conferenceId: args.conferenceId } }).sql.where,
								inArray(schema.delegation.school, args.schoolsToMerge)
							)
						);

					await tx
						.update(schema.singleParticipant)
						.set({ school: args.newSchoolName })
						.where(
							and(
								ctx.abilities.singleParticipant
									.filter('update')
									.merge({ where: { conferenceId: args.conferenceId } }).sql.where,
								inArray(schema.singleParticipant.school, args.schoolsToMerge)
							)
						);
				});
			}

			return db.query.conference
				.findFirst(
					query(
						ctx.abilities.conference.filter('read').merge({ where: { id: args.conferenceId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const conferenceStateEnum = enum_({ tsName: 'conferenceState' });

schemaBuilder.mutationFields((t) => ({
	updateConference: t.drizzleField({
		type: ConferenceRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			longTitle: t.arg.string(),
			location: t.arg.string(),
			language: t.arg.string(),
			website: t.arg.string(),
			info: t.arg.string(),
			showInfoExpanded: t.arg.boolean(),
			linkToPreparationGuide: t.arg.string(),
			linkToTeamWiki: t.arg.string(),
			linkToServicesPage: t.arg.string(),
			linkToPaperInbox: t.arg.string(),
			isOpenPaperSubmission: t.arg.boolean(),
			showCalendar: t.arg.boolean(),
			timezone: t.arg.string(),
			state: t.arg({ type: conferenceStateEnum }),
			startAssignment: t.arg({ type: 'DateTime' }),
			startConference: t.arg({ type: 'DateTime' }),
			endConference: t.arg({ type: 'DateTime' }),
			registrationDeadlineGracePeriodMinutes: t.arg.int(),
			unlockPayments: t.arg.boolean(),
			unlockPostals: t.arg.boolean(),
			feeAmount: t.arg.float(),
			accountHolder: t.arg.string(),
			iban: t.arg.string(),
			bic: t.arg.string(),
			bankName: t.arg.string(),
			currency: t.arg.string(),
			postalName: t.arg.string(),
			postalStreet: t.arg.string(),
			postalApartment: t.arg.string(),
			postalZip: t.arg.string(),
			postalCity: t.arg.string(),
			postalCountry: t.arg.string(),
			// Uploads arrive as data URLs rather than multipart files. Rumble's builder has a fixed
			// scalar map with no `File`, and these columns store data URLs regardless, so the
			// encoding moves to the client and the multipart path disappears.
			imageDataURL: t.arg.string(),
			emblemDataURL: t.arg.string(),
			logoDataURL: t.arg.string(),
			contractContent: t.arg.string(),
			guardianConsentContent: t.arg.string(),
			mediaConsentContent: t.arg.string(),
			termsAndConditionsContent: t.arg.string(),
			certificateContent: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			// An omitted upload leaves the stored value untouched; only a supplied file replaces it.
			await db
				.update(schema.conference)
				.set({
					title: args.title ?? undefined,
					longTitle: args.longTitle ?? undefined,
					location: args.location ?? undefined,
					language: args.language ?? undefined,
					website: args.website ?? undefined,
					info: args.info ?? undefined,
					showInfoExpanded: args.showInfoExpanded ?? undefined,
					linkToPreparationGuide: args.linkToPreparationGuide ?? undefined,
					linkToTeamWiki: args.linkToTeamWiki ?? undefined,
					linkToServicesPage: args.linkToServicesPage ?? undefined,
					linkToPaperInbox: args.linkToPaperInbox ?? undefined,
					isOpenPaperSubmission: args.isOpenPaperSubmission ?? undefined,
					showCalendar: args.showCalendar ?? undefined,
					timezone: args.timezone ?? undefined,
					state: args.state ?? undefined,
					startAssignment: args.startAssignment ?? undefined,
					startConference: args.startConference ?? undefined,
					endConference: args.endConference ?? undefined,
					registrationDeadlineGracePeriodMinutes:
						args.registrationDeadlineGracePeriodMinutes ?? undefined,
					unlockPayments: args.unlockPayments ?? undefined,
					unlockPostals: args.unlockPostals ?? undefined,
					feeAmount: args.feeAmount ?? undefined,
					accountHolder: args.accountHolder ?? undefined,
					iban: args.iban ?? undefined,
					bic: args.bic ?? undefined,
					bankName: args.bankName ?? undefined,
					currency: args.currency ?? undefined,
					postalName: args.postalName ?? undefined,
					postalStreet: args.postalStreet ?? undefined,
					postalApartment: args.postalApartment ?? undefined,
					postalZip: args.postalZip ?? undefined,
					postalCity: args.postalCity ?? undefined,
					postalCountry: args.postalCountry ?? undefined,
					imageDataURL: args.imageDataURL ?? undefined,
					emblemDataURL: args.emblemDataURL ?? undefined,
					logoDataURL: args.logoDataURL ?? undefined,
					contractContent: args.contractContent ?? undefined,
					guardianConsentContent: args.guardianConsentContent ?? undefined,
					mediaConsentContent: args.mediaConsentContent ?? undefined,
					termsAndConditionsContent: args.termsAndConditionsContent ?? undefined,
					certificateContent: args.certificateContent ?? undefined
				})
				.where(
					ctx.abilities.conference.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.conference
				.findFirst(
					query(
						ctx.abilities.conference.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteConference: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.conference)
				.where(
					ctx.abilities.conference.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.conference.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Conference not found, or not yours to delete');
			}
			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Creates a whole conference - committees, non-state actors and custom roles - from a seeding
	 * document. Admin only.
	 */
	seedNewConference: t.drizzleField({
		type: ConferenceRef,
		args: { data: t.arg({ type: 'JSON', required: true }) },
		resolve: async (query, _root, args, ctx) => {
			if (!isSystemAdmin(ctx)) {
				throw new GraphQLError(m.unauthorized({ error: 'User is not admin' }));
			}
			if (!args.data) {
				throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
			}

			const data = ConferenceSeedingSchema.parse(args.data);

			// Checked before the transaction so every offending code can be reported at once: a
			// nation with no row cannot be linked to a committee, and failing mid-transaction would
			// only reveal the first one.
			const knownAlpha2Codes = new Set(
				(await db.query.nation.findMany({ columns: { alpha2Code: true } })).map((nation) =>
					nation.alpha2Code.toLowerCase()
				)
			);
			const unknownNations = data.committees.flatMap((committee) =>
				committee.nations
					.filter((nation) => !knownAlpha2Codes.has(nation.toLowerCase()))
					.map((nation) => `${committee.abbreviation}: ${nation}`)
			);
			if (unknownNations.length > 0) {
				throw new GraphQLError(
					`Unknown nations in the seeding data (only UN member states can be assigned to a committee): ${unknownNations.join(', ')}`
				);
			}

			const created = await db.transaction(async (tx) => {
				const conference = await tx
					.insert(schema.conference)
					.values(data.conference)
					.returning()
					.then(assertFirstEntryExists);

				for (const nsa of data.nsa) {
					await tx.insert(schema.nonStateActor).values({ conferenceId: conference.id, ...nsa });
				}

				for (const role of data.customConferenceRole) {
					await tx
						.insert(schema.customConferenceRole)
						.values({ conferenceId: conference.id, ...role });
				}

				for (const committee of data.committees) {
					const { nations, ...committeeData } = committee;
					const row = await tx
						.insert(schema.committee)
						.values({ ...committeeData, conferenceId: conference.id })
						.returning()
						.then(assertFirstEntryExists);

					// Committee-to-nation is a join table; the seeding document names nations by
					// alpha-2 while the join stores alpha-3, so they are resolved here.
					for (const alpha2 of nations) {
						const nation = await tx.query.nation.findFirst({
							where: { alpha2Code: alpha2.toLowerCase() },
							columns: { alpha3Code: true }
						});
						if (!nation) continue;
						await tx
							.insert(schema.committeeToNation)
							.values({ a: row.id, b: nation.alpha3Code })
							.onConflictDoNothing();
					}
				}

				return conference;
			});

			return db.query.conference
				.findFirst(
					query(
						ctx.abilities.conference.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/**
	 * Every nation seated in any of a conference's committees, deduplicated.
	 *
	 * A nation can sit in several committees, so the flattened list has repeats; dedup is by
	 * alpha-2 code, matching the legacy behaviour.
	 */
	getAllConferenceNations: t.drizzleField({
		type: [NationRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const conference = await db.query.conference
				.findFirst({
					...ctx.abilities.conference.filter('read').merge({ where: { id: args.conferenceId } })
						.query.single,
					with: { committees: { with: { nations: true } } }
				})
				.then(assertFindFirstExists);

			const seen = new Set<string>();
			const alpha3Codes: string[] = [];
			for (const committee of conference.committees) {
				for (const nation of committee.nations) {
					if (seen.has(nation.alpha2Code)) continue;
					seen.add(nation.alpha2Code);
					alpha3Codes.push(nation.alpha3Code);
				}
			}
			if (alpha3Codes.length === 0) return [];

			// Re-queried through `query()` so the caller's field selection is honoured.
			return db.query.nation.findMany(query({ where: { alpha3Code: { in: alpha3Codes } } }));
		}
	})
}));

type PlausibilityUser = InferSelectModel<typeof schema.user>;

const PlausibilityResult = schemaBuilder
	.objectRef<{
		tooYoungUsers: PlausibilityUser[];
		tooOldUsers: PlausibilityUser[];
		shouldBeSupervisor: PlausibilityUser[];
		shouldNotBeSupervisor: PlausibilityUser[];
		dataMissing: PlausibilityUser[];
	}>('PlausibilityResult')
	.implement({
		fields: (t) => ({
			tooYoungUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooYoungUsers }),
			tooOldUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooOldUsers }),
			shouldBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldBeSupervisor
			}),
			shouldNotBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldNotBeSupervisor
			}),
			dataMissing: t.field({ type: [UserRef], resolve: (parent) => parent.dataMissing })
		})
	});

/** January 1st of the year the given age is reached, used as the age cut-off. */
function yearsAgo(years: number) {
	return new Date(new Date().getFullYear() - years, 0, 1);
}

schemaBuilder.queryFields((t) => ({
	/**
	 * Flags participants whose age does not fit the role they registered for, plus those whose
	 * account data no longer satisfies the registration form. Purely advisory - nothing here
	 * blocks a registration, it only gives the organizers a list to look at.
	 */
	conferencePlausibility: t.field({
		type: PlausibilityResult,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const participating = {
				OR: [
					{ singleParticipant: { conferenceId: args.conferenceId } },
					{ delegationMemberships: { conferenceId: args.conferenceId } }
				]
			};
			const supervising = { conferenceSupervisor: { conferenceId: args.conferenceId } };
			const readableUsers = ctx.abilities.user.filter('read');

			const [tooYoungUsers, tooOldUsers, shouldBeSupervisor, shouldNotBeSupervisor, candidates] =
				await Promise.all([
					db.query.user.findMany(
						readableUsers.merge({
							where: { ...participating, birthday: { gt: yearsAgo(13) } }
						}).query.many
					),
					db.query.user.findMany(
						readableUsers.merge({
							where: {
								...participating,
								birthday: { lt: yearsAgo(21), gt: yearsAgo(26) }
							}
						}).query.many
					),
					db.query.user.findMany(
						readableUsers.merge({
							where: { ...participating, birthday: { lt: yearsAgo(26) } }
						}).query.many
					),
					db.query.user.findMany(
						readableUsers.merge({
							where: { ...supervising, birthday: { gt: yearsAgo(21) } }
						}).query.many
					),
					db.query.user.findMany(
						readableUsers.merge({
							where: {
								OR: [
									{ singleParticipant: { conferenceId: args.conferenceId } },
									{ delegationMemberships: { conferenceId: args.conferenceId } },
									{ conferenceSupervisor: { conferenceId: args.conferenceId } }
								]
							}
						}).query.many
					)
				]);

			return {
				tooYoungUsers,
				tooOldUsers,
				shouldBeSupervisor,
				shouldNotBeSupervisor,
				dataMissing: candidates.filter((user) => !userFormSchema.safeParse(user).success)
			};
		}
	})
}));
