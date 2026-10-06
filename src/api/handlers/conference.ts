import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	assertTeamRole,
	isParticipantOfConference,
	isTeamMemberOf,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { NationRef } from './nation';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { m } from '$lib/paraglide/messages';
import { isSystemAdmin } from '$api/services/authHelper';
import { enum_ } from '$api/rumble';
import { and, eq, inArray, max } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import type { InferSelectModel } from 'drizzle-orm';
import { UserRef } from './user';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';
import { nullToUndefined } from '$api/services/args';
import { distinctNationCodes, schoolRows } from '$api/services/conferenceAggregates';
import { totalSeats } from '$api/services/seatPlanning';

const ConferenceSchools = schemaBuilder.simpleObject('ConferenceSchools', {
	fields: (t) => ({
		school: t.string(),
		delegationCount: t.int(),
		delegationMembers: t.int(),
		singleParticipants: t.int(),
		sumParticipants: t.int()
	})
});

/** Where the fee goes, where postal documents go, and the documents themselves. */
const MEMBERS_ONLY = {
	accountHolder: false,
	iban: false,
	bic: false,
	bankName: false,
	postalName: false,
	postalStreet: false,
	postalApartment: false,
	postalZip: false,
	postalCity: false,
	postalCountry: false,
	contractContent: false,
	guardianConsentContent: false,
	mediaConsentContent: false,
	termsAndConditionsContent: false,
	certificateContent: false
};
/** The team's internal tools. */
const TEAM_ONLY = { linkToTeamWiki: false, linkToServicesPage: false };

// Everyone can see which conferences exist and their details - short of the members-only and
// team-only columns.
abilityBuilder.conference
	.allow('read')
	.when(() => ({ columns: { ...MEMBERS_ONLY, ...TEAM_ONLY } }));
abilityBuilder.conference.allow('read').when(systemAdmin);

// Participants and supervisors also read the members-only columns.
abilityBuilder.conference.allow('read').when((ctx) => {
	const participant = isParticipantOfConference(ctx);
	return participant ? { where: participant.conference, columns: TEAM_ONLY } : undefined;
});

// The team reads all of it.
abilityBuilder.conference.allow('read').when((ctx) => where(isTeamMemberOf(ctx)));

// Update and delete are limited to the conference's own project management.
abilityBuilder.conference
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOf(ctx, PROJECT_MANAGEMENT_ROLES)));

const ConferenceRef = object({
	table: 'conference',
	adjust: (t) => ({
		// The four document templates and the certificate template are long HTML blobs. The
		// configuration UI only needs to know whether each one has been filled in, so these
		// flags let it avoid transferring the content itself.
		contractContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.contractContent
		}),
		guardianConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.guardianConsentContent
		}),
		mediaConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.mediaConsentContent
		}),
		termsAndConditionsContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.termsAndConditionsContent
		}),
		certificateContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.certificateContent
		}),

		/** Everyone who actually holds a seat - delegates of assigned delegations plus role holders. */
		totalParticipants: t.field({
			type: 'Int',
			resolve: async (conference) => {
				const [members, participants] = await Promise.all([
					db.query.delegationMember.findMany({
						where: {
							delegation: {
								conferenceId: conference.id,
								OR: [
									{ assignedNationAlpha3Code: { isNotNull: true } },
									{ assignedNonStateActorId: { isNotNull: true } }
								]
							}
						},
						columns: { id: true }
					}),
					db.query.singleParticipant.findMany({
						where: { conferenceId: conference.id, assignedRoleId: { isNotNull: true } },
						columns: { id: true }
					})
				]);

				return members.length + participants.length;
			}
		}),

		/**
		 * Seats on offer: every nation of a committee is worth its `numOfSeatsPerDelegation`, every
		 * non-state actor its `seatAmount`.
		 */
		totalSeats: t.field({
			type: 'Int',
			resolve: async (conference) => {
				const [committees, nonStateActors] = await Promise.all([
					db.query.committee.findMany({
						where: { conferenceId: conference.id },
						columns: { numOfSeatsPerDelegation: true },
						with: { nations: { columns: { alpha3Code: true } } }
					}),
					db.query.nonStateActor.findMany({
						where: { conferenceId: conference.id },
						columns: { seatAmount: true }
					})
				]);

				return totalSeats(committees, nonStateActors);
			}
		}),

		waitingListLength: t.field({
			type: 'Int',
			resolve: async (conference) =>
				(
					await db.query.waitingListEntry.findMany({
						where: { conferenceId: conference.id },
						columns: { id: true }
					})
				).length
		}),

		/** The document number to hand to the next participant who needs one. */
		nextDocumentNumber: t.field({
			type: 'Int',
			resolve: async (conference) => {
				const [highest] = await db
					.select({ max: max(schema.conferenceParticipantStatus.assignedDocumentNumber) })
					.from(schema.conferenceParticipantStatus)
					.where(eq(schema.conferenceParticipantStatus.conferenceId, conference.id));

				return (highest?.max ?? 0) + 1;
			}
		}),

		/**
		 * Applied registrations grouped by the school they named, which is how the organizers see
		 * which schools are sending how many people.
		 */
		schools: t.field({
			type: [ConferenceSchools],
			resolve: async (conference, _args, ctx) => {
				const [delegations, participants] = await Promise.all([
					db.query.delegation.findMany(
						(await ctx.abilities.delegation.filter('read')).merge({
							where: {
								conferenceId: conference.id,
								applied: true,
								school: { isNotNull: true }
							}
						}).query.many
					),
					db.query.singleParticipant.findMany(
						(await ctx.abilities.singleParticipant.filter('read')).merge({
							where: {
								conferenceId: conference.id,
								applied: true,
								school: { isNotNull: true }
							}
						}).query.many
					)
				]);

				const memberCounts = await db.query.delegationMember.findMany({
					where: { delegation: { conferenceId: conference.id, applied: true } },
					columns: { delegationId: true }
				});

				return schoolRows(delegations, memberCounts, participants);
			}
		})
	})
});

query({ table: 'conference' });
const pubsub = rumblePubsub({ table: 'conference' });
// Seeding a conference fills it, and normalizing schools rewrites registrations inside it.
const committeePubsub = rumblePubsub({ table: 'committee' });
const customConferenceRolePubsub = rumblePubsub({ table: 'customConferenceRole' });
const nonStateActorPubsub = rumblePubsub({ table: 'nonStateActor' });
const delegationPubsub = rumblePubsub({ table: 'delegation' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });

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
								(await ctx.abilities.delegation.filter('update')).merge({
									where: { conferenceId: args.conferenceId }
								}).sql.where,
								inArray(schema.delegation.school, args.schoolsToMerge)
							)
						);

					await tx
						.update(schema.singleParticipant)
						.set({ school: args.newSchoolName })
						.where(
							and(
								(await ctx.abilities.singleParticipant.filter('update')).merge({
									where: { conferenceId: args.conferenceId }
								}).sql.where,
								inArray(schema.singleParticipant.school, args.schoolsToMerge)
							)
						);
				});
			}

			delegationPubsub.updated();
			singleParticipantPubsub.updated();

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({
							where: { id: args.conferenceId }
						}).query.single
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
				// An omitted argument arrives as `undefined` and leaves the column alone; an
				// explicit `null` clears it. Only the non-nullable columns coerce null away.
				.set({
					title: nullToUndefined(args.title),
					longTitle: args.longTitle,
					location: args.location,
					language: args.language,
					website: args.website,
					info: args.info,
					showInfoExpanded: nullToUndefined(args.showInfoExpanded),
					linkToPreparationGuide: args.linkToPreparationGuide,
					linkToTeamWiki: args.linkToTeamWiki,
					linkToServicesPage: args.linkToServicesPage,
					linkToPaperInbox: args.linkToPaperInbox,
					isOpenPaperSubmission: nullToUndefined(args.isOpenPaperSubmission),
					showCalendar: nullToUndefined(args.showCalendar),
					timezone: nullToUndefined(args.timezone),
					state: nullToUndefined(args.state),
					startAssignment: nullToUndefined(args.startAssignment),
					startConference: nullToUndefined(args.startConference),
					endConference: nullToUndefined(args.endConference),
					registrationDeadlineGracePeriodMinutes: nullToUndefined(
						args.registrationDeadlineGracePeriodMinutes
					),
					unlockPayments: nullToUndefined(args.unlockPayments),
					unlockPostals: nullToUndefined(args.unlockPostals),
					feeAmount: args.feeAmount,
					accountHolder: args.accountHolder,
					iban: args.iban,
					bic: args.bic,
					bankName: args.bankName,
					currency: args.currency,
					postalName: args.postalName,
					postalStreet: args.postalStreet,
					postalApartment: args.postalApartment,
					postalZip: args.postalZip,
					postalCity: args.postalCity,
					postalCountry: args.postalCountry,
					imageDataURL: args.imageDataURL,
					emblemDataURL: args.emblemDataURL,
					logoDataURL: args.logoDataURL,
					contractContent: args.contractContent,
					guardianConsentContent: args.guardianConsentContent,
					mediaConsentContent: args.mediaConsentContent,
					termsAndConditionsContent: args.termsAndConditionsContent,
					certificateContent: args.certificateContent
				})
				.where(
					(await ctx.abilities.conference.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			pubsub.updated(args.id);

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
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

			pubsub.created();
			committeePubsub.created();
			customConferenceRolePubsub.created();
			nonStateActorPubsub.created();

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({ where: { id: created.id } })
							.query.single
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
					...(await ctx.abilities.conference.filter('read')).merge({
						where: { id: args.conferenceId }
					}).query.single,
					with: { committees: { with: { nations: true } } }
				})
				.then(assertFindFirstExists);

			const alpha3Codes = distinctNationCodes(conference.committees);
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

/**
 * The registration form still names these two fields the way the OIDC claims do, so a database
 * row has to be renamed into that shape before the form's schema can judge it complete.
 */
function toFormShape(user: PlausibilityUser) {
	const { givenName, familyName, ...rest } = user;
	return { ...rest, given_name: givenName, family_name: familyName };
}

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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const participating = {
				OR: [
					{ singleParticipant: { conferenceId: args.conferenceId } },
					{ delegationMemberships: { conferenceId: args.conferenceId } }
				]
			};
			const supervising = { conferenceSupervisor: { conferenceId: args.conferenceId } };
			const readableUsers = await ctx.abilities.user.filter('read');

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
				dataMissing: candidates.filter(
					(user) => !userFormSchema.safeParse(toFormShape(user)).success
				)
			};
		}
	})
}));
