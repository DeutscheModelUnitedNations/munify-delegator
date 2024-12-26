import { builder } from '../../builder';
import {
	ConferenceAccountHolderFieldObject,
	ConferenceBankNameFieldObject,
	ConferenceBicFieldObject,
	ConferenceCurrencyFieldObject,
	ConferenceEndConferenceFieldObject,
	ConferenceFeeAmountFieldObject,
	ConferenceGuardianConsentContentFieldObject,
	ConferenceIbanFieldObject,
	ConferenceIdFieldObject,
	ConferenceImageDataURLFieldObject,
	ConferenceInfoFieldObject,
	ConferenceLanguageFieldObject,
	ConferenceLinkToPreparationGuideFieldObject,
	ConferenceLocationFieldObject,
	ConferenceLongTitleFieldObject,
	ConferenceMediaConsentContentFieldObject,
	ConferencePostalApartmentFieldObject,
	ConferencePostalCityFieldObject,
	ConferencePostalNameFieldObject,
	ConferencePostalStreetFieldObject,
	ConferencePostalZipFieldObject,
	ConferenceStartAssignmentFieldObject,
	ConferenceStartConferenceFieldObject,
	ConferenceStateFieldObject,
	ConferenceTermsAndConditionsContentFieldObject,
	ConferenceTitleFieldObject,
	ConferenceWebsiteFieldObject,
	createOneConferenceMutationObject,
	deleteOneConferenceMutationObject,
	findManyConferenceQueryObject,
	findUniqueConferenceQueryObject,
	updateOneConferenceMutationObject
} from '$db/generated/graphql/Conference';
import { toDataURL } from '$api/services/fileToDataURL';
import { db } from '$db/db';
import { conferenceSettingsFormSchema } from '../../../../routes/(authenticated)/management/[conferenceId]/configuration/form-schema';
import { ConferenceState } from '$db/generated/graphql/inputs';
import { conferenceCreationFormSchema } from '../../../../routes/(authenticated)/management/create-conference/form-schema';

builder.prismaObject('Conference', {
	fields: (t) => ({
		id: t.field(ConferenceIdFieldObject),
		title: t.field(ConferenceTitleFieldObject),
		info: t.field(ConferenceInfoFieldObject),
		linkToPreparationGuide: t.field(ConferenceLinkToPreparationGuideFieldObject),
		longTitle: t.field(ConferenceLongTitleFieldObject),
		location: t.field(ConferenceLocationFieldObject),
		language: t.field(ConferenceLanguageFieldObject),
		website: t.field(ConferenceWebsiteFieldObject),
		imageDataURL: t.field(ConferenceImageDataURLFieldObject),
		state: t.field(ConferenceStateFieldObject),
		startAssignment: t.field(ConferenceStartAssignmentFieldObject),
		startConference: t.field(ConferenceStartConferenceFieldObject),
		endConference: t.field(ConferenceEndConferenceFieldObject),
		feeAmount: t.float(ConferenceFeeAmountFieldObject),
		accountHolder: t.string(ConferenceAccountHolderFieldObject),
		iban: t.string(ConferenceIbanFieldObject),
		bic: t.string(ConferenceBicFieldObject),
		bankName: t.string(ConferenceBankNameFieldObject),
		currency: t.string(ConferenceCurrencyFieldObject),
		postalName: t.string(ConferencePostalNameFieldObject),
		postalStreet: t.string(ConferencePostalStreetFieldObject),
		postalApartment: t.string(ConferencePostalApartmentFieldObject),
		postalZip: t.string(ConferencePostalZipFieldObject),
		postalCity: t.string(ConferencePostalCityFieldObject),
		postalCountry: t.string(ConferencePostalCityFieldObject),
		termsAndConditionsContent: t.string(ConferenceTermsAndConditionsContentFieldObject),
		guardianConsentContent: t.string(ConferenceGuardianConsentContentFieldObject),
		mediaConsentContent: t.string(ConferenceMediaConsentContentFieldObject),
		paymentTransactions: t.relation('paymentTransactions', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').PaymentTransaction
			})
		}),
		individualApplicationOptions: t.relation('individualApplicationOptions', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CustomConferenceRole
			})
		}),
		delegations: t.relation('delegations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Delegation
			})
		}),
		nonStateActors: t.relation('nonStateActors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').NonStateActor
			})
		}),
		conferenceSupervisors: t.relation('conferenceSupervisors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		}),
		conferenceUserStatus: t.relation('conferenceUserStatus', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceParticipantStatus
			})
		}),
		teamMembers: t.relation('teamMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').TeamMember
			})
		}),
		committees: t.relation('committees', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Committee
			})
		}),
		singleParticipants: t.relation('singleParticipants', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SingleParticipant
			})
		}),
		delegationMembers: t.relation('delegationMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyConferenceQueryObject(t);
	return {
		findManyConferences: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Conference]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueConferenceQueryObject(t);
	return {
		findUniqueConference: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Conference]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneConferenceMutationObject(t);
	return {
		createOneConference: t.prismaField({
			...field,
			args: {
				data: t.arg({
					type: t.builder.inputType('ConferenceCreateDataInput', {
						fields: (t) => ({
							title: t.string(),
							longTitle: t.string({
								required: false
							}),
							location: t.string({
								required: false
							}),
							language: t.string({
								required: false
							}),
							website: t.string({
								required: false
							}),
							image: t.field({
								type: 'File',
								required: false
							}),
							info: t.string({
								required: false
							}),
							linkToPreparationGuide: t.string({
								required: false
							}),
							startAssignment: t.field({ type: 'DateTime' }),
							startConference: t.field({ type: 'DateTime' }),
							endConference: t.field({ type: 'DateTime' }),
							feeAmount: t.float({
								required: false
							}),
							accountHolder: t.string({
								required: false
							}),
							iban: t.string({
								required: false
							}),
							bic: t.string({
								required: false
							}),
							bankName: t.string({
								required: false
							}),
							currency: t.string({
								required: false
							}),
							postalName: t.string({
								required: false
							}),
							postalStreet: t.string({
								required: false
							}),
							postalApartment: t.string({
								required: false
							}),
							postalZip: t.string({
								required: false
							}),
							postalCity: t.string({
								required: false
							}),
							postalCountry: t.string({
								required: false
							}),
							termsAndConditionsContent: t.string({
								required: false
							}),
							guardianConsentContent: t.string({
								required: false
							}),
							mediaConsentContent: t.string({
								required: false
							}),
							committees: t.field({
								type: [
									t.builder.inputType('CommitteeCreateDataInput', {
										fields: (t) => ({
											name: t.string(),
											abbreviation: t.string(),
											numOfSeatsPerDelegation: t.int(),
											representedNationsAlpha3Codes: t.stringList()
										})
									})
								]
							}),
							nonStateActors: t.field({
								type: [
									t.builder.inputType('NonStateActorCreateDataInput', {
										fields: (t) => ({
											name: t.string(),
											abbreviation: t.string(),
											description: t.string(),
											fontAwesomeIcon: t.string({ required: false }),
											seatAmount: t.int()
										})
									})
								]
							})
						})
					})
				})
			},
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				ctx.permissions.checkIf((user) => user.can('create', 'Conference'));
				const data = conferenceCreationFormSchema.parse(args.data);

				const dataURL = data.image ? await toDataURL(data.image) : data.image;
				data.image = undefined;

				const fieldData = {
					...data,
					imageDataURL: dataURL,
					nonStateActors: undefined,
					committees: undefined
				};

				return await db.conference.create({
					data: {
						...fieldData,
						nonStateActors: {
							createMany: {
								data: data.nonStateActors
							}
						},
						committees: {
							createMany: {
								data: data.committees
							}
						},
						teamMembers: {
							create: {
								role: 'PROJECT_MANAGEMENT',
								userId: user.sub
							}
						}
					},
					...query
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneConferenceMutationObject(t);
	return {
		updateOneConference: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('ConferenceUpdateDataInput', {
						fields: (t) => ({
							title: t.string({
								required: false
							}),
							info: t.string({
								required: false
							}),
							linkToPreparationGuide: t.string({
								required: false
							}),
							longTitle: t.string({
								required: false
							}),
							location: t.string({
								required: false
							}),
							language: t.string({
								required: false
							}),
							website: t.string({
								required: false
							}),
							image: t.field({
								type: 'File',
								required: false
							}),
							state: t.field({ type: ConferenceState, required: false }),
							startAssignment: t.field({ type: 'DateTime', required: false }),
							startConference: t.field({ type: 'DateTime', required: false }),
							endConference: t.field({ type: 'DateTime', required: false }),
							feeAmount: t.float({
								required: false
							}),
							accountHolder: t.string({
								required: false
							}),
							iban: t.string({
								required: false
							}),
							bic: t.string({
								required: false
							}),
							bankName: t.string({
								required: false
							}),
							currency: t.string({
								required: false
							}),
							postalName: t.string({
								required: false
							}),
							postalStreet: t.string({
								required: false
							}),
							postalApartment: t.string({
								required: false
							}),
							postalZip: t.string({
								required: false
							}),
							postalCity: t.string({
								required: false
							}),
							postalCountry: t.string({
								required: false
							}),
							termsAndConditionsContent: t.string({
								required: false
							}),
							guardianConsentContent: t.string({
								required: false
							}),
							mediaConsentContent: t.string({
								required: false
							})
						})
					})
				})
			},
			resolve: async (query, root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
				};

				conferenceSettingsFormSchema.parse(args.data);

				const dataURL = args.data.image ? await toDataURL(args.data.image) : args.data.image;
				args.data.image = undefined;

				return await db.conference.update({
					where: args.where,
					data: {
						...args.data,
						imageDataURL: dataURL,
						title: args.data.title ?? undefined,
						info: args.data.info ?? undefined,
						state: args.data.state ?? undefined,
						startAssignment: args.data.startAssignment ?? undefined,
						startConference: args.data.startConference ?? undefined,
						endConference: args.data.endConference ?? undefined
					},
					...query
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneConferenceMutationObject(t);
	return {
		deleteOneConference: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Conference]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
