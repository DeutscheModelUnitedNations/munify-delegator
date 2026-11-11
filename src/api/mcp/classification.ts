/**
 * What of the GraphQL schema an AI assistant connected through the MCP server may see.
 *
 * Every leaf field of every object type is listed here, and anything that is not - a field added
 * later, a type nobody classified - is redacted (`classifyField`). `classification.test.ts` fails
 * while a field is missing, so a new column cannot reach an assistant by accident: whoever adds it
 * decides here.
 *
 * - `visible`: not about a person, or one of the few attributes the team may hand an assistant:
 *   ids, statuses, counts, roles and seats, the minor flag, the school, country and city.
 * - `aggregate`: a count by an attribute that is redacted per person (gender, diet, postal area).
 *   Shown, but any count between 1 and `MIN_GROUP_SIZE - 1` reads `<5`, so it cannot single out a
 *   person.
 * - `redacted`: everything else about a person - names, contact details, address lines, birthday,
 *   gender, pronouns, diet, emergency contacts - every free text written by or about people
 *   (notes, motivation, review comments), and codes, tokens and other secrets.
 *
 * Fields that hold objects are not listed: the walker descends into them and classifies their
 * leaves.
 */

export type FieldClass = 'visible' | 'aggregate' | 'redacted';

/** What an assistant reads instead of a redacted value. `null` stays `null`. */
export const REDACTED = '[redacted]';

/** Below this many people a count by a redacted attribute reads `<5`. */
export const MIN_GROUP_SIZE = 5;

/** What an assistant reads instead of a count below `MIN_GROUP_SIZE`. */
export const SMALL_GROUP = `<${MIN_GROUP_SIZE}`;

interface TypeClassification {
	visible?: readonly string[];
	aggregate?: readonly string[];
	redacted?: readonly string[];
}

/** Columns every rumble table type has. */
const ROW = ['id', 'createdAt', 'updatedAt', 'search_distance'] as const;

const FIELDS: Record<string, TypeClassification> = {
	// --- People ---------------------------------------------------------------------------------
	User: {
		// The country and city a person lives in, never the address lines.
		visible: [...ROW, 'city', 'region', 'country', 'conferenceParticipationsCount'],
		redacted: [
			'email',
			'givenName',
			'familyName',
			'preferredUsername',
			'birthday',
			'phone',
			'street',
			'apartment',
			'zip',
			'pronouns',
			'gender',
			'foodPreference',
			'emergencyContacts',
			'globalNotes',
			'locale',
			'wantsJoinTeamInformation',
			'wantsToReceiveGeneralInformation'
		]
	},
	// The caller's own age against a conference's range; the age and its verdict are a person's.
	AgeNotice: {
		visible: ['participantMinAge', 'participantMaxAge', 'supervisorMinAge'],
		redacted: ['age', 'issue']
	},
	// What holds a person's application back: their age verdict and which of their profile fields
	// fail are about them, like the age notice.
	ApplicationBlocker: {
		visible: ['userId'],
		redacted: ['ageIssue', 'invalidFields']
	},
	Address: {
		visible: ['locality', 'region', 'countryCode'],
		redacted: ['streetAddress', 'postalCode']
	},
	Conferenceparticipant: {
		visible: [
			...ROW,
			'conferenceId',
			'userId',
			'schoolId',
			'assignedDocumentNumber',
			'checkIssues',
			'didAttend',
			'guardianConsent',
			'mediaConsent',
			'mediaConsentStatus',
			'ofAgeAtConference',
			'paymentStatus',
			'termsAndConditions',
			'nsaCardNumber'
		],
		// The number printed on the person's badge.
		redacted: ['accessCardId']
	},
	Conferencesupervisor: {
		visible: [...ROW, 'conferenceParticipantId', 'plansOwnAttendenceAtConference'],
		redacted: ['connectionCode']
	},
	Delegation: {
		visible: [...ROW, 'conferenceId', 'assignedRoleId', 'applied', 'memberCount'],
		redacted: ['entryCode', 'experience', 'motivation']
	},
	Delegationmember: {
		visible: [
			...ROW,
			'conferenceParticipantId',
			'delegationId',
			'assignedCommitteeId',
			'isHeadDelegate'
		]
	},
	Singleparticipant: {
		visible: [...ROW, 'conferenceParticipantId', 'assignedRoleId', 'applied'],
		redacted: ['experience', 'motivation']
	},
	Waitinglistentry: {
		visible: [...ROW, 'conferenceId', 'userId', 'schoolId', 'assignedAt', 'hidden'],
		redacted: ['experience', 'motivation', 'requests']
	},
	Teammember: { visible: [...ROW, 'conferenceId', 'userId', 'role'] },
	Teammemberinvitation: {
		visible: [
			...ROW,
			'conferenceId',
			'role',
			'expiresAt',
			'usedAt',
			'revokedAt',
			'invitedById',
			'acceptedById',
			'userExists'
		],
		redacted: ['email', 'token']
	},
	Possibleduplicate: {
		// `reasons` names the kinds of signals the accounts share (`name`, `birthday`, …), not values.
		visible: [
			...ROW,
			'userId',
			'candidateId',
			'score',
			'reasons',
			'status',
			'inferred',
			'decidedById',
			'decidedAt'
		]
	},
	PossibleDuplicateAttendance: { visible: ['conferenceId', 'title', 'role', 'startConference'] },
	Searchhistory: {
		visible: [...ROW, 'conferenceId', 'userId', 'originId', 'resultId'],
		// What was searched for, typically a name.
		redacted: ['label']
	},
	Surveyanswer: {
		visible: [...ROW, 'conferenceParticipantId', 'questionId', 'optionId']
	},
	Paymenttransaction: { visible: [...ROW, 'payerParticipantId', 'amount', 'recievedAt'] },
	Userreferenceinpaymenttransaction: {
		visible: [...ROW, 'conferenceParticipantId', 'paymentTransactionId']
	},
	Attendanceentry: {
		visible: [
			...ROW,
			'conferenceParticipantId',
			'sessionId',
			'recordedById',
			'timestamp',
			'checkPassed'
		]
	},

	// --- Assignment -----------------------------------------------------------------------------
	Assignmentreview: {
		visible: [
			...ROW,
			'conferenceId',
			'delegationId',
			'singleParticipantId',
			'evaluation',
			'flagged',
			'disqualified',
			'required',
			'prioritizedRoleId'
		],
		redacted: ['note']
	},
	Assignmentsinglerole: { visible: [...ROW, 'roleId', 'singleParticipantId'] },
	Assignmentunit: {
		visible: [...ROW, 'conferenceId', 'roleId', 'sourceDelegationId', 'sourceSingleParticipantId']
	},
	Assignmentunitmember: { visible: [...ROW, 'delegationMemberId', 'unitId'] },
	Assignmentweights: {
		visible: [
			...ROW,
			'conferenceId',
			'experienceEffect',
			'experienceModifier',
			'markBonus',
			'markEffect',
			'nullRating',
			'ratingFactor'
		]
	},
	Roleapplication: { visible: [...ROW, 'delegationId', 'roleId', 'rank'] },
	SightingDeck: { visible: ['index', 'overallRated', 'overallTotal', 'start', 'total'] },
	SightingDeckCounts: { visible: ['disqualified', 'flagged', 'rated', 'unrated'] },
	SightingDeckEntry: { visible: ['id', 'kind', 'required', 'school', 'size', 'status'] },
	SightingNameMatch: { visible: ['id'] },
	SightingSchool: { visible: ['applications', 'city', 'people', 'school', 'schoolId'] },
	CollectiveGroup: {
		visible: ['key', 'singleParticipantIds', 'size', 'supervisorId']
	},
	CollectiveGroupMember: { visible: ['delegationId', 'delegationMemberId'] },
	CollectiveGroupSchool: { visible: ['id', 'isForeignSchool', 'name'] },
	SeatPlanningAssignedRole: { visible: ['memberCount', 'nationAlpha3Code', 'roleId'] },
	SeatPlanningCommitteeSeat: {
		visible: ['committeeId', 'nationAlpha3Code'],
		redacted: ['memberNames']
	},

	// --- The conference and its content ---------------------------------------------------------
	Conference: {
		// The organizer's own data is not a person's, except where it can name one: the account
		// holder and the postal addressee may be the treasurer, and the account theirs.
		redacted: ['bankAccountHolder', 'iban', 'bic', 'postalName'],
		visible: [
			...ROW,
			'applicationDeadline',
			'assignmentReleased',
			'assignmentReleasedAt',
			'bankName',
			'certificateFileId',
			'contractFileId',
			'currency',
			'documentLayouts',
			'emailsPerSecond',
			'emblemFileId',
			'endConference',
			'feeAmount',
			'guardianConsentFileId',
			'imageFileId',
			'info',
			'isOpenPaperSubmission',
			'language',
			'linkToPaperInbox',
			'linkToPreparationGuide',
			'linkToServicesPage',
			'linkToTeamWiki',
			'location',
			'logoFileId',
			'longTitle',
			'maxCollectiveGroupSize',
			'maxForeignGuaranteedSeatsPercent',
			'maxGuaranteedSeatsPerForeignSchool',
			'mcpEnabled',
			'mediaConsentFileId',
			'nametagBinCount',
			'nextDocumentNumber',
			'participantMaxAge',
			'participantMinAge',
			'postalApartment',
			'postalCity',
			'postalCountry',
			'postalStreet',
			'postalZip',
			'registrationDeadlineGracePeriodMinutes',
			'showCalendar',
			'showInfoExpanded',
			'startConference',
			'state',
			'supervisorMinAge',
			'termsAndConditionsFileId',
			'timezone',
			'title',
			'totalParticipants',
			'totalSeats',
			'unlockPayments',
			'unlockPostals',
			'waitingListLength',
			'website'
		]
	},
	Committee: {
		visible: [
			...ROW,
			'abbreviation',
			'conferenceId',
			'name',
			'numOfSeatsPerDelegation',
			'regionalBaseline',
			'regionalBaselineTargets',
			'resolutionHeadline'
		]
	},
	Committeeagendaitem: {
		visible: [...ROW, 'committeeId', 'reviewHelpStatus', 'teaserText', 'title']
	},
	Conferencerole: {
		visible: [
			...ROW,
			'abbreviation',
			'conferenceId',
			'description',
			'icon',
			'kind',
			'name',
			'nationAlpha3Code',
			'seatAmount'
		]
	},
	Nation: { visible: ['createdAt', 'updatedAt', 'search_distance', 'alpha2Code', 'alpha3Code'] },
	Calendarday: { visible: [...ROW, 'conferenceId', 'date', 'name'] },
	Calendarentry: {
		visible: [
			...ROW,
			'calendarDayId',
			'color',
			'description',
			'endTime',
			'icon',
			'name',
			'placeId',
			'room',
			'startTime'
		]
	},
	Calendartrack: { visible: [...ROW, 'conferenceId', 'description', 'name', 'sortOrder'] },
	Place: {
		visible: [
			...ROW,
			'address',
			'conferenceId',
			'directions',
			'info',
			'latitude',
			'longitude',
			'name',
			'sitePlanFileId',
			'websiteUrl'
		]
	},
	Surveyquestion: {
		visible: [
			...ROW,
			'conferenceId',
			'deadline',
			'description',
			'draft',
			'hidden',
			'showSelectionOnDashboard',
			'title'
		]
	},
	Surveyoption: {
		visible: [...ROW, 'countSurveyAnswers', 'description', 'questionId', 'title', 'upperLimit']
	},
	Attendancesession: {
		visible: [
			...ROW,
			'conferenceId',
			'createdById',
			'endedAt',
			'entryCount',
			'mode',
			'occasion',
			'showOnCertificate',
			'startedAt'
		]
	},
	Resolution: {
		visible: [
			...ROW,
			'committeeId',
			'conferenceId',
			'fileId',
			'title',
			'chasePaperId',
			'chaseSnapshotId'
		]
	},

	// --- The CHASE link -------------------------------------------------------------------------
	Instancelink: {
		visible: [...ROW, 'remoteUrl', 'lastEventAt', 'lastReconcileAt'],
		redacted: ['lastError']
	},
	// CHASE's presence records name people by their e-mail address.
	ChasePresence: { visible: ['conferenceId', 'exportedAt'] },
	ChasePresenceParticipant: { visible: ['kind', 'committeeId'], redacted: ['email'] },
	ChasePresenceRepresentation: {
		visible: ['id', 'type', 'alpha2Code', 'alpha3Code', 'icon', 'name']
	},
	ChasePresenceEvent: { visible: ['id', 'committeeId', 'present', 'type', 'timestamp'] },
	NsaCard: {
		visible: ['conferenceParticipantId', 'cardNumber', 'nsaIcon', 'nsaName'],
		redacted: ['givenName', 'familyName', 'code']
	},
	Storedfile: {
		// Every stored file is a conference picture, template, site plan or resolution.
		visible: [...ROW, 'fileName', 'key', 'mimeType', 'purpose', 'size', 'uploadedById', 'url'],
		// A capability to write the file, not something to read.
		redacted: ['uploadUrl']
	},
	NametagBin: {
		visible: [
			'fromLetter',
			'index',
			'letters',
			'nationParticipants',
			'otherParticipants',
			'participants',
			'toLetter'
		]
	},
	NametagBinGroup: {
		visible: [
			'icon',
			'nationAlpha2Code',
			'nationAlpha3Code',
			'participants',
			'roleName',
			'sortName'
		]
	},
	OwnNametagTable: { visible: ['fromLetter', 'index', 'others', 'toLetter'] },

	// --- Papers: the texts are the conference's work, their authors stay ids ---------------------
	Paper: {
		visible: [
			...ROW,
			'agendaItemId',
			'authorParticipantId',
			'delegationId',
			'firstSubmittedAt',
			'status',
			'type'
		]
	},
	Paperversion: {
		visible: [
			'id',
			'createdAt',
			'search_distance',
			'content',
			'contentHash',
			'paperId',
			'status',
			'version'
		]
	},
	Paperreview: {
		visible: [
			'id',
			'createdAt',
			'search_distance',
			'paperVersionId',
			'reviewerId',
			'statusAfter',
			'statusBefore'
		],
		// What a reviewer wrote to a participant.
		redacted: ['comments']
	},
	Reviewersnippet: {
		visible: [...ROW, 'name', 'userId'],
		redacted: ['content']
	},
	ReviewerStat: {
		// A code name made up per reviewer, not their name.
		visible: ['anonymizedName', 'firstReviews', 'isCurrentUser', 'totalReviews']
	},
	MyReviewStats: { visible: ['firstReviews', 'followUpReviews', 'totalReviews'] },
	CreatePaperReviewResult: { visible: ['pieceUnlocked', 'reviewId'] },
	FlagCollectionStats: {
		visible: ['completedFlags', 'foundPieces', 'totalFlags', 'totalPieces', 'unlockedPieces']
	},
	FlagPiece: {
		visible: ['agendaItemId', 'agendaItemTitle', 'committeeAbbreviation', 'id', 'state']
	},
	FlagProgress: {
		visible: [
			'abbreviation',
			'alpha2Code',
			'alpha3Code',
			'icon',
			'foundPieces',
			'id',
			'isComplete',
			'name',
			'totalPieces',
			'type',
			'unlockedPieces'
		]
	},
	UnlockedPieceData: {
		visible: [
			'flagAlpha2Code',
			'flagAlpha3Code',
			'flagId',
			'flagName',
			'flagType',
			'icon',
			'foundCount',
			'isComplete',
			'pieceName',
			'totalCount'
		]
	},

	// --- Schools: the institution, never its contact person ---------------------------------------
	School: {
		visible: [...ROW, 'name', 'city', 'region', 'country', 'isForeignSchool', 'website'],
		redacted: ['street', 'apartment', 'zip', 'contactName', 'contactEmail', 'contactPhone', 'notes']
	},
	ConferenceSchools: {
		visible: [
			'delegationCount',
			'delegationMembers',
			'school',
			'schoolId',
			'singleParticipants',
			'sumParticipants'
		]
	},
	SchoolConferenceMetrics: {
		visible: [
			'applied',
			'attended',
			'conferenceId',
			'conferenceTitle',
			'delegations',
			'fromWaitingList',
			'participants',
			'seated',
			'startConference',
			'supervisors',
			'waitingList'
		]
	},
	Schoolsuggestion: { visible: [...ROW, 'conferenceId', 'dismissed', 'key', 'similarity'] },
	Schoolsuggestionvariant: { visible: [...ROW, 'schoolId', 'suggestionId', 'sumParticipants'] },

	// --- Mails ----------------------------------------------------------------------------------
	Conferenceemailfooter: { visible: [...ROW, 'conferenceId', 'locale', 'text'] },
	Conferenceemailsetting: { visible: [...ROW, 'conferenceId', 'enabled', 'kind'] },
	Conferenceemailtext: {
		visible: [...ROW, 'body', 'conferenceId', 'heading', 'kind', 'locale', 'subject']
	},
	Emaillog: {
		visible: [
			...ROW,
			'attempts',
			'conferenceId',
			'kind',
			'sentAt',
			'sentById',
			'status',
			'subjectKey',
			'trigger',
			'userId'
		],
		// The address, and the mail server's answer, which tends to quote it.
		redacted: ['email', 'error']
	},
	EmailKindStats: { visible: ['failed', 'kind', 'sent', 'skipped'] },
	OpenEmailCount: { visible: ['kind', 'open'] },
	// A rendered mail greets its recipient by name.
	EmailPreview: { redacted: ['html', 'subject'] },
	EmailStatusResult: { visible: ['status'], redacted: ['email'] },
	PersonEmail: {
		visible: ['automatic', 'kind', 'lastAt', 'lastStatus', 'subjectKey'],
		// Names the student a supervisor is told about.
		redacted: ['detail']
	},
	SendPersonEmailResult: { visible: ['sent'], redacted: ['error'] },

	// --- The MCP log --------------------------------------------------------------------------
	Mcpauditentry: {
		visible: [
			'id',
			'createdAt',
			'search_distance',
			'conferenceId',
			'userId',
			'clientId',
			'tool',
			'outcome',
			'durationMs'
		],
		// What an assistant sent, and the refusals quoting it: a refused query can hold a name.
		redacted: ['arguments', 'message']
	},

	// --- Lists and pages ------------------------------------------------------------------------
	UpdateAllConferenceParticipantsResponse: { visible: ['changed'] },
	// The team's tables (`dataTable/`): row ids and counts. A page's values and a group's value are
	// the rows' own columns, a family name among them, so they stay hidden.
	DataTablePage: { visible: ['hasMore', 'ids', 'total'], redacted: ['values'] },
	DataTableGroup: { aggregate: ['count'], redacted: ['value'] },
	// Saved views: who and where are ids; the name and the state are text people wrote, and a
	// filter in the state can hold a name.
	Tableview: {
		visible: [
			...ROW,
			'conferenceId',
			'createdById',
			'isDefault',
			'ownerUserId',
			'shared',
			'tableKey'
		],
		redacted: ['name', 'state']
	},
	Tableviewdefault: { visible: [...ROW, 'conferenceId', 'tableKey', 'userId', 'viewId'] },
	DelegationPreview: {
		visible: [
			'applied',
			'conferenceId',
			'conferenceTitle',
			'headDelegateSchoolId',
			'headDelegateSchoolName',
			'id',
			'memberCount',
			'schools'
		],
		redacted: ['entryCode', 'headDelegateFullName']
	},
	PreviewConferenceSupervisor: {
		visible: ['different_school', 'school_city', 'school_name'],
		redacted: ['family_name', 'given_name']
	},
	ScanLookupResult: {
		visible: [
			'checkPassed',
			'committeeAbbreviation',
			'didAttend',
			'found',
			'guardianConsent',
			'inConference',
			'isHeadDelegate',
			'isSupervisor',
			'isTeamMember',
			'isWaitingList',
			'issues',
			'mayRecordAnyway',
			'missingSurveyOptions',
			'nationAlpha2Code',
			'nationAlpha3Code',
			'nonStateActorIcon',
			'nonStateActorName',
			'paymentStatus',
			'singleRoleName',
			'termsAndConditions',
			'userId'
		],
		redacted: ['birthday', 'familyName', 'givenName']
	},

	// --- Statistics -----------------------------------------------------------------------------
	StatisticsResult: { visible: ['refreshedAt'] },
	StatisticsResultAddresses: {
		visible: ['country', 'lat', 'lng', 'zipPrefix'],
		aggregate: ['count']
	},
	StatisticsResultAgeCategoryBreakdown: { visible: ['categoryId', 'count'] },
	StatisticsResultAgeCategoryStats: {
		visible: ['average', 'categoryId', 'categoryName', 'categoryType', 'count']
	},
	StatisticsResultAgeCommitteeStats: {
		visible: ['abbreviation', 'average', 'committeeId', 'committeeName', 'count']
	},
	StatisticsResultAgeDistributionEntry: { visible: ['age', 'count'] },
	StatisticsResultAgeOverall: { visible: ['average', 'missingBirthdays', 'total'] },
	StatisticsResultCommitteeFillRate: {
		visible: [
			'abbreviation',
			'assignedSeats',
			'committeeId',
			'fillPercentage',
			'name',
			'totalSeats'
		]
	},
	StatisticsResultCountdowns: { visible: ['daysUntilConference', 'daysUntilEndRegistration'] },
	StatisticsResultNationality: { visible: ['count', 'country'] },
	StatisticsResultPaperStats: { visible: ['total', 'withReviews', 'withoutReviews'] },
	StatisticsResultPapersByCommittee: {
		visible: ['abbreviation', 'committeeId', 'count', 'name']
	},
	StatisticsResultPapersByStatus: {
		visible: ['accepted', 'changesRequested', 'draft', 'submitted']
	},
	StatisticsResultPapersByType: {
		visible: ['introductionPaper', 'positionPaper', 'workingPaper']
	},
	StatisticsResultPostalPaymentProgress: {
		visible: [
			'bothComplete',
			'maxParticipants',
			'neitherComplete',
			'paymentDone',
			'paymentOnlyComplete',
			'paymentPending',
			'paymentPercentage',
			'paymentProblem',
			'postalDone',
			'postalOnlyComplete',
			'postalPending',
			'postalPercentage',
			'postalProblem'
		]
	},
	StatisticsResultRegistered: { visible: ['applied', 'notApplied', 'supervisors', 'total'] },
	StatisticsResultRegisteredDelegationMembers: { visible: ['applied', 'notApplied', 'total'] },
	StatisticsResultRegisteredDelegations: { visible: ['applied', 'notApplied', 'total'] },
	StatisticsResultRegisteredParticipantDietVariations: {
		aggregate: ['omnivore', 'vegan', 'vegetarian']
	},
	StatisticsResultRegisteredParticipantGenderVariations: {
		aggregate: ['diverse', 'female', 'male', 'noStatement']
	},
	StatisticsResultRegisteredSingleParticipants: { visible: ['applied', 'notApplied', 'total'] },
	StatisticsResultRegisteredSingleParticipantsByRole: {
		visible: ['applied', 'icon', 'notApplied', 'role', 'total']
	},
	StatisticsResultRegistrationTimeline: {
		visible: [
			'cumulativeDelegationMembers',
			'cumulativeDelegations',
			'cumulativeSingleParticipants',
			'cumulativeSupervisors',
			'date'
		]
	},
	StatisticsResultRoleBased: {
		visible: [
			'delegationMembersWithCommittee',
			'delegationMembersWithRole',
			'delegationMembersWithoutCommittee',
			'delegationMembersWithoutRole',
			'delegationsWithAssignment',
			'delegationsWithoutAssignment',
			'singleParticipantsWithRole',
			'singleParticipantsWithoutRole'
		]
	},
	StatisticsResultSchool: { visible: ['people', 'school'] },
	StatisticsResultSupervisorStats: {
		visible: [
			'accepted',
			'acceptedAndNotPresent',
			'acceptedAndPresent',
			'doesNotPlanAttendance',
			'plansAttendance',
			'rejected',
			'rejectedAndNotPresent',
			'rejectedAndPresent',
			'total'
		]
	},
	StatisticsResultWaitingList: {
		visible: ['assigned', 'hidden', 'total', 'unassigned', 'visible']
	},

	// --- Identity, sessions and secrets: nothing for an assistant ---------------------------------
	Certificate: { visible: ['sessions'], redacted: ['fullName', 'code'] },
	SignedCode: { redacted: ['code'] },
	SignedCodeKey: { visible: ['kid', 'publicKey'] },
	JWK: { visible: ['alg', 'e', 'kty', 'n', 'use'] },
	ImpersonationStatus: { visible: ['isImpersonating'] },
	ImpersonationUser: {
		visible: ['sub'],
		redacted: ['email', 'family_name', 'given_name', 'preferred_username']
	},
	OfflineUser: {
		visible: ['sub'],
		redacted: [
			'email',
			'family_name',
			'given_name',
			'hasPassword',
			'locale',
			'mfaVerificationFactors',
			'phone',
			'preferred_username',
			'socialIdentities'
		]
	},
	OfflineUserSsoIdentity: { redacted: ['identityId', 'issuer'] },
	CreatedInvitation: {
		visible: ['addedDirectly', 'expiresAt', 'id', 'role'],
		redacted: ['email', 'token']
	},
	InvitationError: { redacted: ['email', 'error'] },
	RegeneratedInvitation: { visible: ['expiresAt'], redacted: ['token'] },

	// --- Root fields returning plain values -----------------------------------------------------
	Query: {
		visible: [
			'assignmentReviewsCount',
			'canImpersonateUser',
			'canUpdateSchool',
			'delegationsCount',
			'logoutUrl',
			'mcpServerUrl',
			'myOIDCRoles',
			'papersCount',
			'supervisorSignupOpen',
			'teamMembersCount',
			'waitingListEntriesCount'
		]
	}
};

const lookup = new Map<string, FieldClass>();
for (const [typeName, classes] of Object.entries(FIELDS)) {
	for (const fieldClass of ['visible', 'aggregate', 'redacted'] as const) {
		for (const field of classes[fieldClass] ?? []) {
			lookup.set(`${typeName}.${field}`, fieldClass);
		}
	}
}

/**
 * How a leaf field may reach an assistant; `undefined` for a field nobody classified, which the
 * caller treats as redacted.
 */
export function fieldClassOf({ typeName, fieldName }: { typeName: string; fieldName: string }) {
	return lookup.get(`${typeName}.${fieldName}`);
}

/** How a leaf field may reach an assistant: `fieldClassOf`, redacted when unclassified. */
export function classifyField({
	typeName,
	fieldName
}: {
	typeName: string;
	fieldName: string;
}): FieldClass {
	return fieldClassOf({ typeName, fieldName }) ?? 'redacted';
}

/** Every classified field, as `Type.field`, for the coverage test. */
export function classifiedFields() {
	return [...lookup.keys()];
}

/**
 * Free-form arguments (strings, JSON, input objects) of fields that are not rumble's `where`,
 * `orderBy` or `search`, which an assistant may pass. Every other one is refused: it could look a
 * person up by name, code or address. Plain ids, numbers, booleans, enums and dates are always
 * fine. Listed as `Type.field.argument`.
 */
export const ALLOWED_FREE_ARGUMENTS: ReadonlySet<string> = new Set([
	// School names are not personal.
	'Query.searchSchools.search',
	'Query.sightingSchools.search',
	// Cache busters.
	'Query.openEmailCounts.revision',
	'Query.personEmails.revision',
	// Workflow states of the sighting.
	'Query.sightingDeck.status',
	'Query.sightingEntries.status'
]);
