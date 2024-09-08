-- CreateEnum
CREATE TYPE "ConferenceStatus" AS ENUM ('PRE', 'ACTIVE', 'POST');

-- CreateEnum
CREATE TYPE "FoodPreference" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN');

-- CreateEnum
CREATE TYPE "AdministrativeStatus" AS ENUM ('DONE', 'PROBLEM', 'PENDING');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('ADMIN', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE', 'MEMBER');

-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "longTitle" TEXT,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "location" TEXT,
    "language" TEXT,
    "website" TEXT,
    "image" BYTEA,
    "status" "ConferenceStatus" NOT NULL DEFAULT 'PRE',
    "startRegistration" TIMESTAMP(3),
    "endRegistration" TIMESTAMP(3),

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "numOfSeatsPerDelegation" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "given_name" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "preferred_username" TEXT NOT NULL,
    "birthday" TIMESTAMP(3),
    "phone" TEXT,
    "street" TEXT,
    "apartment" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "gender" TEXT,
    "pronouns" TEXT,
    "foodPreference" "FoodPreference",
    "wantsToReceiveGeneralInformation" BOOLEAN NOT NULL DEFAULT false,
    "wantsJoinTeamInformation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceParticipantStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "postalRegistration" "AdministrativeStatus" NOT NULL,
    "paymentStatus" "AdministrativeStatus" NOT NULL,
    "didAttend" BOOLEAN NOT NULL,

    CONSTRAINT "ConferenceParticipantStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nation" (
    "alpha3Code" TEXT NOT NULL,
    "alpha2Code" TEXT NOT NULL,

    CONSTRAINT "Nation_pkey" PRIMARY KEY ("alpha3Code")
);

-- CreateTable
CREATE TABLE "NonStateActor" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fontAwesomeIcon" TEXT,
    "abbreviation" TEXT NOT NULL,
    "seatAmount" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "NonStateActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomConferenceRole" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fontAwesomeIcon" TEXT,

    CONSTRAINT "CustomConferenceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SingleParticipant" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "school" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "experience" TEXT NOT NULL,

    CONSTRAINT "SingleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "entryCode" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "school" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "experience" TEXT NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleApplication" (
    "id" TEXT NOT NULL,
    "nationId" TEXT,
    "nonStateActorId" TEXT,
    "rank" INTEGER NOT NULL,
    "delegationId" TEXT,

    CONSTRAINT "RoleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegationMember" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "delegationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHeadDelegate" BOOLEAN NOT NULL,

    CONSTRAINT "DelegationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceSupervisor" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plansOwnAttendenceAtConference" BOOLEAN NOT NULL,

    CONSTRAINT "ConferenceSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommitteeToNation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomConferenceRoleToSingleParticipant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ConferenceSupervisorToDelegation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Nation_alpha2Code_key" ON "Nation"("alpha2Code");

-- CreateIndex
CREATE UNIQUE INDEX "NonStateActor_name_key" ON "NonStateActor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NonStateActor_abbreviation_key" ON "NonStateActor"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "CustomConferenceRole_conferenceId_name_key" ON "CustomConferenceRole"("conferenceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SingleParticipant_conferenceId_userId_key" ON "SingleParticipant"("conferenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_entryCode_key" ON "Delegation"("entryCode");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_nationId_key" ON "RoleApplication"("delegationId", "nationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_nonStateActorId_key" ON "RoleApplication"("delegationId", "nonStateActorId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_rank_key" ON "RoleApplication"("delegationId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationMember_delegationId_userId_key" ON "DelegationMember"("delegationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationMember_conferenceId_userId_key" ON "DelegationMember"("conferenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceSupervisor_conferenceId_userId_key" ON "ConferenceSupervisor"("conferenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_CommitteeToNation_AB_unique" ON "_CommitteeToNation"("A", "B");

-- CreateIndex
CREATE INDEX "_CommitteeToNation_B_index" ON "_CommitteeToNation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomConferenceRoleToSingleParticipant_AB_unique" ON "_CustomConferenceRoleToSingleParticipant"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomConferenceRoleToSingleParticipant_B_index" ON "_CustomConferenceRoleToSingleParticipant"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ConferenceSupervisorToDelegation_AB_unique" ON "_ConferenceSupervisorToDelegation"("A", "B");

-- CreateIndex
CREATE INDEX "_ConferenceSupervisorToDelegation_B_index" ON "_ConferenceSupervisorToDelegation"("B");

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonStateActor" ADD CONSTRAINT "NonStateActor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomConferenceRole" ADD CONSTRAINT "CustomConferenceRole_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nonStateActorId_fkey" FOREIGN KEY ("nonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_A_fkey" FOREIGN KEY ("A") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_B_fkey" FOREIGN KEY ("B") REFERENCES "Nation"("alpha3Code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" ADD CONSTRAINT "_CustomConferenceRoleToSingleParticipant_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomConferenceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" ADD CONSTRAINT "_CustomConferenceRoleToSingleParticipant_B_fkey" FOREIGN KEY ("B") REFERENCES "SingleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" ADD CONSTRAINT "_ConferenceSupervisorToDelegation_A_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" ADD CONSTRAINT "_ConferenceSupervisorToDelegation_B_fkey" FOREIGN KEY ("B") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
