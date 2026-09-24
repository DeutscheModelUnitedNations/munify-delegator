CREATE TYPE "AdministrativeStatus" AS ENUM('DONE', 'PROBLEM', 'PENDING');--> statement-breakpoint
CREATE TYPE "CalendarEntryColor" AS ENUM('SESSION', 'WORKSHOP', 'LOGISTICS', 'SOCIAL', 'CEREMONY', 'BREAK', 'HIGHLIGHT', 'INFO');--> statement-breakpoint
CREATE TYPE "ConferenceState" AS ENUM('PRE', 'PARTICIPANT_REGISTRATION', 'PREPARATION', 'ACTIVE', 'POST');--> statement-breakpoint
CREATE TYPE "FoodPreference" AS ENUM('OMNIVORE', 'VEGETARIAN', 'VEGAN');--> statement-breakpoint
CREATE TYPE "Gender" AS ENUM('MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT');--> statement-breakpoint
CREATE TYPE "MediaConsentStatus" AS ENUM('NOT_SET', 'ALLOWED_ALL', 'PARTIALLY_ALLOWED', 'NOT_ALLOWED');--> statement-breakpoint
CREATE TYPE "PaperStatus" AS ENUM('SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED', 'DRAFT', 'REVISED');--> statement-breakpoint
CREATE TYPE "PaperType" AS ENUM('POSITION_PAPER', 'WORKING_PAPER', 'INTRODUCTION_PAPER');--> statement-breakpoint
CREATE TYPE "ReviewHelpStatus" AS ENUM('UNSPECIFIED', 'HELP_NEEDED', 'NO_HELP_WANTED');--> statement-breakpoint
CREATE TYPE "TeamRole" AS ENUM('PROJECT_MANAGEMENT', 'PARTICIPANT_CARE', 'MEMBER', 'REVIEWER', 'TEAM_COORDINATOR');--> statement-breakpoint
CREATE TABLE "AttendanceEntry" (
	"id" text PRIMARY KEY,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"occasion" text NOT NULL,
	"conferenceParticipantStatusId" text NOT NULL,
	"recordedById" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CalendarDay" (
	"id" text PRIMARY KEY,
	"date" timestamp(3) NOT NULL,
	"name" text NOT NULL,
	"sortOrder" integer NOT NULL,
	"conferenceId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CalendarEntry" (
	"id" text PRIMARY KEY,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fontAwesomeIcon" text,
	"color" "CalendarEntryColor" DEFAULT 'SESSION'::"CalendarEntryColor" NOT NULL,
	"room" text,
	"calendarDayId" text NOT NULL,
	"calendarTrackId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"placeId" text
);
--> statement-breakpoint
CREATE TABLE "CalendarTrack" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"sortOrder" integer NOT NULL,
	"calendarDayId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Committee" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"conferenceId" text NOT NULL,
	"numOfSeatsPerDelegation" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resolutionHeadline" text
);
--> statement-breakpoint
CREATE TABLE "CommitteeAgendaItem" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"teaserText" text,
	"committeeId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reviewHelpStatus" "ReviewHelpStatus" DEFAULT 'UNSPECIFIED'::"ReviewHelpStatus" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_CommitteeToNation" (
	"A" text,
	"B" text,
	CONSTRAINT "_CommitteeToNation_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "Conference" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"longTitle" text,
	"location" text,
	"language" text,
	"website" text,
	"endConference" timestamp(3) NOT NULL,
	"startAssignment" timestamp(3) NOT NULL,
	"startConference" timestamp(3) NOT NULL,
	"state" "ConferenceState" DEFAULT 'PRE'::"ConferenceState" NOT NULL,
	"imageDataURL" text,
	"info" text,
	"linkToPreparationGuide" text,
	"accountHolder" text,
	"bankName" text,
	"bic" text,
	"currency" text DEFAULT 'EUR',
	"feeAmount" double precision,
	"guardianConsentContent" text,
	"iban" text,
	"mediaConsentContent" text,
	"postalApartment" text,
	"postalCity" text,
	"postalCountry" text,
	"postalName" text,
	"postalStreet" text,
	"postalZip" text,
	"termsAndConditionsContent" text,
	"unlockPayments" boolean DEFAULT false NOT NULL,
	"unlockPostals" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"linkToPaperInbox" text,
	"contractContent" text,
	"certificateContent" text,
	"registrationDeadlineGracePeriodMinutes" integer DEFAULT 30 NOT NULL,
	"isOpenPaperSubmission" boolean DEFAULT false NOT NULL,
	"emblemDataURL" text,
	"showInfoExpanded" boolean DEFAULT false NOT NULL,
	"linkToServicesPage" text,
	"linkToTeamWiki" text,
	"logoDataURL" text,
	"showCalendar" boolean DEFAULT false NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ConferenceParticipantStatus" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"conferenceId" text NOT NULL,
	"paymentStatus" "AdministrativeStatus" DEFAULT 'PENDING'::"AdministrativeStatus" NOT NULL,
	"didAttend" boolean DEFAULT false NOT NULL,
	"guardianConsent" "AdministrativeStatus" DEFAULT 'PENDING'::"AdministrativeStatus" NOT NULL,
	"mediaConsent" "AdministrativeStatus" DEFAULT 'PENDING'::"AdministrativeStatus" NOT NULL,
	"termsAndConditions" "AdministrativeStatus" DEFAULT 'PENDING'::"AdministrativeStatus" NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"mediaConsentStatus" "MediaConsentStatus" DEFAULT 'NOT_SET'::"MediaConsentStatus" NOT NULL,
	"assigendDocumentNumber" integer,
	"accessCardId" text
);
--> statement-breakpoint
CREATE TABLE "ConferenceSupervisor" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"userId" text NOT NULL,
	"plansOwnAttendenceAtConference" boolean NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"connectionCode" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_ConferenceSupervisorToDelegationMember" (
	"A" text,
	"B" text,
	CONSTRAINT "_ConferenceSupervisorToDelegationMember_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_ConferenceSupervisorToSingleParticipant" (
	"A" text,
	"B" text,
	CONSTRAINT "_ConferenceSupervisorToSingleParticipant_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "CustomConferenceRole" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"fontAwesomeIcon" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"seatAmount" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_CustomConferenceRoleToSingleParticipant" (
	"A" text,
	"B" text,
	CONSTRAINT "_CustomConferenceRoleToSingleParticipant_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "Delegation" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"entryCode" text NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"school" text,
	"motivation" text,
	"experience" text,
	"assignedNationAlpha3Code" text,
	"assignedNonStateActorId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DelegationMember" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"delegationId" text NOT NULL,
	"userId" text NOT NULL,
	"isHeadDelegate" boolean NOT NULL,
	"assignedCommitteeId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Nation" (
	"alpha3Code" text PRIMARY KEY,
	"alpha2Code" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NonStateActor" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"fontAwesomeIcon" text,
	"abbreviation" text NOT NULL,
	"seatAmount" integer DEFAULT 2 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Paper" (
	"id" text PRIMARY KEY,
	"authorId" text NOT NULL,
	"delegationId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "PaperStatus" DEFAULT 'SUBMITTED'::"PaperStatus" NOT NULL,
	"agendaItemId" text,
	"type" "PaperType" NOT NULL,
	"conferenceId" text NOT NULL,
	"firstSubmittedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "PaperReview" (
	"id" text PRIMARY KEY,
	"comments" jsonb NOT NULL,
	"reviewerId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"paperVersionId" text NOT NULL,
	"statusAfter" "PaperStatus",
	"statusBefore" "PaperStatus"
);
--> statement-breakpoint
CREATE TABLE "PaperVersion" (
	"id" text PRIMARY KEY,
	"version" integer NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"paperId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "PaperStatus" DEFAULT 'DRAFT'::"PaperStatus" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentTransaction" (
	"id" text PRIMARY KEY,
	"amount" double precision NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"recievedAt" timestamp(3),
	"conferenceId" text NOT NULL,
	"userId" text NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Place" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"directions" text,
	"info" text,
	"websiteUrl" text,
	"sitePlanDataURL" text,
	"conferenceId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ReviewerSnippet" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"content" jsonb NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RoleApplication" (
	"id" text PRIMARY KEY,
	"nationId" text,
	"nonStateActorId" text,
	"rank" integer NOT NULL,
	"delegationId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SingleParticipant" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"userId" text NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"school" text,
	"motivation" text,
	"experience" text,
	"assignedRoleId" text,
	"assignmentDetails" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SurveyAnswer" (
	"id" text PRIMARY KEY,
	"questionId" text NOT NULL,
	"userId" text NOT NULL,
	"optionId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SurveyOption" (
	"id" text PRIMARY KEY,
	"questionId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"upperLimit" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SurveyQuestion" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"deadline" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"draft" boolean DEFAULT true NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"showSelectionOnDashboard" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TeamMember" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "TeamRole" DEFAULT 'MEMBER'::"TeamRole" NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TeamMemberInvitation" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"role" "TeamRole" NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"usedAt" timestamp(3),
	"revokedAt" timestamp(3),
	"conferenceId" text NOT NULL,
	"invitedById" text NOT NULL,
	"acceptedById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"family_name" text NOT NULL,
	"given_name" text NOT NULL,
	"locale" text NOT NULL,
	"preferred_username" text NOT NULL,
	"birthday" timestamp(3),
	"phone" text,
	"street" text,
	"apartment" text,
	"zip" text,
	"city" text,
	"country" text,
	"pronouns" text,
	"foodPreference" "FoodPreference",
	"wantsToReceiveGeneralInformation" boolean DEFAULT false NOT NULL,
	"wantsJoinTeamInformation" boolean DEFAULT false NOT NULL,
	"gender" "Gender",
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"emergencyContacts" text,
	"globalNotes" text
);
--> statement-breakpoint
CREATE TABLE "UserReferenceInPaymentTransaction" (
	"id" text PRIMARY KEY,
	"paymentTransactionId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WaitingListEntry" (
	"id" text PRIMARY KEY,
	"conferenceId" text NOT NULL,
	"userId" text NOT NULL,
	"school" text NOT NULL,
	"experience" text NOT NULL,
	"motivation" text NOT NULL,
	"requests" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"assigned" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CalendarDay_conferenceId_sortOrder_key" ON "CalendarDay" ("conferenceId","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "CalendarTrack_calendarDayId_sortOrder_key" ON "CalendarTrack" ("calendarDayId","sortOrder");--> statement-breakpoint
CREATE INDEX "_CommitteeToNation_B_index" ON "_CommitteeToNation" ("B");--> statement-breakpoint
CREATE UNIQUE INDEX "ConferenceParticipantStatus_conferenceId_assigendDocumentNu_key" ON "ConferenceParticipantStatus" ("conferenceId","assigendDocumentNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "ConferenceParticipantStatus_userId_conferenceId_key" ON "ConferenceParticipantStatus" ("userId","conferenceId");--> statement-breakpoint
CREATE UNIQUE INDEX "ConferenceSupervisor_conferenceId_connectionCode_key" ON "ConferenceSupervisor" ("conferenceId","connectionCode");--> statement-breakpoint
CREATE UNIQUE INDEX "ConferenceSupervisor_conferenceId_userId_key" ON "ConferenceSupervisor" ("conferenceId","userId");--> statement-breakpoint
CREATE INDEX "_ConferenceSupervisorToDelegationMember_B_index" ON "_ConferenceSupervisorToDelegationMember" ("B");--> statement-breakpoint
CREATE INDEX "_ConferenceSupervisorToSingleParticipant_B_index" ON "_ConferenceSupervisorToSingleParticipant" ("B");--> statement-breakpoint
CREATE UNIQUE INDEX "CustomConferenceRole_conferenceId_name_key" ON "CustomConferenceRole" ("conferenceId","name");--> statement-breakpoint
CREATE INDEX "_CustomConferenceRoleToSingleParticipant_B_index" ON "_CustomConferenceRoleToSingleParticipant" ("B");--> statement-breakpoint
CREATE UNIQUE INDEX "Delegation_conferenceId_assignedNationAlpha3Code_key" ON "Delegation" ("conferenceId","assignedNationAlpha3Code");--> statement-breakpoint
CREATE UNIQUE INDEX "Delegation_conferenceId_assignedNonStateActorId_key" ON "Delegation" ("conferenceId","assignedNonStateActorId");--> statement-breakpoint
CREATE UNIQUE INDEX "Delegation_conferenceId_entryCode_key" ON "Delegation" ("conferenceId","entryCode");--> statement-breakpoint
CREATE UNIQUE INDEX "DelegationMember_conferenceId_userId_key" ON "DelegationMember" ("conferenceId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "DelegationMember_delegationId_userId_key" ON "DelegationMember" ("delegationId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "Nation_alpha2Code_key" ON "Nation" ("alpha2Code");--> statement-breakpoint
CREATE UNIQUE INDEX "NonStateActor_conferenceId_abbreviation_key" ON "NonStateActor" ("conferenceId","abbreviation");--> statement-breakpoint
CREATE UNIQUE INDEX "NonStateActor_conferenceId_name_key" ON "NonStateActor" ("conferenceId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "PaperVersion_paperId_version_key" ON "PaperVersion" ("paperId","version");--> statement-breakpoint
CREATE UNIQUE INDEX "Place_conferenceId_name_key" ON "Place" ("conferenceId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ReviewerSnippet_userId_name_key" ON "ReviewerSnippet" ("userId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "RoleApplication_delegationId_nationId_key" ON "RoleApplication" ("delegationId","nationId");--> statement-breakpoint
CREATE UNIQUE INDEX "RoleApplication_delegationId_nonStateActorId_key" ON "RoleApplication" ("delegationId","nonStateActorId");--> statement-breakpoint
CREATE UNIQUE INDEX "RoleApplication_delegationId_rank_key" ON "RoleApplication" ("delegationId","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "SingleParticipant_conferenceId_userId_key" ON "SingleParticipant" ("conferenceId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "SurveyAnswer_questionId_userId_key" ON "SurveyAnswer" ("questionId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "SurveyOption_questionId_title_key" ON "SurveyOption" ("questionId","title");--> statement-breakpoint
CREATE UNIQUE INDEX "SurveyQuestion_conferenceId_title_key" ON "SurveyQuestion" ("conferenceId","title");--> statement-breakpoint
CREATE UNIQUE INDEX "TeamMember_conferenceId_userId_key" ON "TeamMember" ("conferenceId","userId");--> statement-breakpoint
CREATE INDEX "TeamMemberInvitation_conferenceId_email_idx" ON "TeamMemberInvitation" ("conferenceId","email");--> statement-breakpoint
CREATE UNIQUE INDEX "TeamMemberInvitation_conferenceId_email_pending_key" ON "TeamMemberInvitation" ("conferenceId","email") WHERE (("usedAt" IS NULL) AND ("revokedAt" IS NULL));--> statement-breakpoint
CREATE INDEX "TeamMemberInvitation_conferenceId_idx" ON "TeamMemberInvitation" ("conferenceId");--> statement-breakpoint
CREATE INDEX "TeamMemberInvitation_token_idx" ON "TeamMemberInvitation" ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "TeamMemberInvitation_token_key" ON "TeamMemberInvitation" ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "WaitingListEntry_conferenceId_userId_key" ON "WaitingListEntry" ("conferenceId","userId");--> statement-breakpoint
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_tZpYdr06IEqk_fkey" FOREIGN KEY ("conferenceParticipantStatusId") REFERENCES "ConferenceParticipantStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_recordedById_User_id_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_calendarDayId_CalendarDay_id_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_calendarTrackId_CalendarTrack_id_fkey" FOREIGN KEY ("calendarTrackId") REFERENCES "CalendarTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_placeId_Place_id_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CalendarTrack" ADD CONSTRAINT "CalendarTrack_calendarDayId_CalendarDay_id_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CommitteeAgendaItem" ADD CONSTRAINT "CommitteeAgendaItem_committeeId_Committee_id_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_A_Committee_id_fkey" FOREIGN KEY ("A") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_B_Nation_alpha3Code_fkey" FOREIGN KEY ("B") REFERENCES "Nation"("alpha3Code") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_qbb5Tl3fXZ9Z_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_c9YL75qyYL1w_fkey" FOREIGN KEY ("B") REFERENCES "DelegationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToSingleParticipant" ADD CONSTRAINT "_ConferenceSupervisorToSingleParticipant_lOmvXaLQ7Emw_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToSingleParticipant" ADD CONSTRAINT "_ConferenceSupervisorToSingleParticipant_SYhIytq03cXG_fkey" FOREIGN KEY ("B") REFERENCES "SingleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "CustomConferenceRole" ADD CONSTRAINT "CustomConferenceRole_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" ADD CONSTRAINT "_CustomConferenceRoleToSingleParticipant_OlTbG7SUhG4i_fkey" FOREIGN KEY ("A") REFERENCES "CustomConferenceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" ADD CONSTRAINT "_CustomConferenceRoleToSingleParticipant_eEmIGzXiLYGr_fkey" FOREIGN KEY ("B") REFERENCES "SingleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNationAlpha3Code_Nation_alpha3Code_fkey" FOREIGN KEY ("assignedNationAlpha3Code") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNonStateActorId_NonStateActor_id_fkey" FOREIGN KEY ("assignedNonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_delegationId_Delegation_id_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_assignedCommitteeId_Committee_id_fkey" FOREIGN KEY ("assignedCommitteeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "NonStateActor" ADD CONSTRAINT "NonStateActor_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_authorId_User_id_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_delegationId_Delegation_id_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_agendaItemId_CommitteeAgendaItem_id_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "CommitteeAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_reviewerId_User_id_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_paperVersionId_PaperVersion_id_fkey" FOREIGN KEY ("paperVersionId") REFERENCES "PaperVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "PaperVersion" ADD CONSTRAINT "PaperVersion_paperId_Paper_id_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Place" ADD CONSTRAINT "Place_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ReviewerSnippet" ADD CONSTRAINT "ReviewerSnippet_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nationId_Nation_alpha3Code_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nonStateActorId_NonStateActor_id_fkey" FOREIGN KEY ("nonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_delegationId_Delegation_id_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_assignedRoleId_CustomConferenceRole_id_fkey" FOREIGN KEY ("assignedRoleId") REFERENCES "CustomConferenceRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_SurveyQuestion_id_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_optionId_SurveyOption_id_fkey" FOREIGN KEY ("optionId") REFERENCES "SurveyOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SurveyOption" ADD CONSTRAINT "SurveyOption_questionId_SurveyQuestion_id_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_invitedById_User_id_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_acceptedById_User_id_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "UserReferenceInPaymentTransaction" ADD CONSTRAINT "UserReferenceInPaymentTransaction_5XV6pmj4zavE_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "UserReferenceInPaymentTransaction" ADD CONSTRAINT "UserReferenceInPaymentTransaction_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_conferenceId_Conference_id_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_userId_User_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;