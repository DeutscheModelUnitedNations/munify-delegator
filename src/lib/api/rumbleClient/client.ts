// This file is auto-generated. Do not edit manually.
// @generated
/* eslint-disable */
// biome-ignore-all lint: This file is auto-generated
// biome-ignore-all assist: This file is auto-generated
// biome-ignore-all syntax: This file is auto-generated
import { urqlClient } from "../client";
import { Client, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { nativeDateExchange } from '@m1212e/rumble/client';
import { schema } from './schema';
import { makeLiveQuery, makeMutation, makeSubscription, makeQuery } from '@m1212e/rumble/client';

export type Address = {
  countryCode: String | null,
  locality: String | null,
  postalCode: String | null,
  region: String | null,
  streetAddress: String | null    
};
		
export type AddressInput = {
  countryCode: String,
  locality?: String | null | undefined,
  postalCode?: String | null | undefined,
  region?: String | null | undefined,
  streetAddress: String    
};
		
export type AdministrativestatusEnum = "DONE" | "PENDING" | "PROBLEM";
		
export type AgendaItemPaperGroup = {
  agendaItem: () => Committeeagendaitem | null,
  papers: () => Paper[]    
};
		
export type Attendanceentry = {
  conferenceParticipantStatus: (p?: {
    orderBy?: ConferenceparticipantstatusOrderInputArgument | null | undefined,
    where?: ConferenceparticipantstatusWhereInputArgument | null | undefined
  }) => Conferenceparticipantstatus,
  conferenceParticipantStatusId: ID,
  createdAt: DateTime,
  id: ID,
  occasion: String,
  recordedBy: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  recordedById: ID,
  timestamp: DateTime,
  updatedAt: DateTime    
};
		
export type AttendanceentryOrderInputArgument = {
  conferenceParticipantStatusId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  occasion?: SortingParameter | null | undefined,
  recordedById?: SortingParameter | null | undefined,
  timestamp?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type AttendanceentryWhereInputArgument = {
  AND?: AttendanceentryWhereInputArgument[] | undefined,
  NOT?: AttendanceentryWhereInputArgument | null | undefined,
  OR?: AttendanceentryWhereInputArgument[] | undefined,
  conferenceParticipantStatus?: ConferenceparticipantstatusWhereInputArgument | null | undefined,
  conferenceParticipantStatusId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  occasion?: StringWhereInputArgument | null | undefined,
  recordedBy?: UserWhereInputArgument | null | undefined,
  recordedById?: IDWhereInputArgument | null | undefined,
  timestamp?: DateTimeWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type BigInt = unknown;
		
export type BigIntWhereInputArgument = {
  AND?: BigIntWhereInputArgument[] | undefined,
  NOT?: BigIntWhereInputArgument | null | undefined,
  OR?: BigIntWhereInputArgument[] | undefined,
  eq?: BigInt | null | undefined,
  gt?: BigInt | null | undefined,
  gte?: BigInt | null | undefined,
  in?: BigInt[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  lt?: BigInt | null | undefined,
  lte?: BigInt | null | undefined,
  ne?: BigInt | null | undefined,
  notIn?: BigInt[] | undefined    
};
		
export type Boolean = boolean;
		
export type BooleanWhereInputArgument = {
  AND?: BooleanWhereInputArgument[] | undefined,
  NOT?: BooleanWhereInputArgument | null | undefined,
  OR?: BooleanWhereInputArgument[] | undefined,
  arrayContained?: Boolean[] | undefined,
  arrayContains?: Boolean[] | undefined,
  arrayOverlaps?: Boolean[] | undefined,
  eq?: Boolean | null | undefined,
  in?: Boolean[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  ne?: Boolean | null | undefined,
  notIn?: Boolean[] | undefined    
};
		
export type Bytes = unknown;
		
export type Calendarday = {
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  date: DateTime,
  entries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendarentryOrderInputArgument | null | undefined,
    where?: CalendarentryWhereInputArgument | null | undefined
  }) => Calendarentry[],
  id: ID,
  name: String,
  sortOrder: Int,
  tracks: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendartrackOrderInputArgument | null | undefined,
    where?: CalendartrackWhereInputArgument | null | undefined
  }) => Calendartrack[],
  updatedAt: DateTime    
};
		
export type CalendardayOrderInputArgument = {
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  date?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  sortOrder?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CalendardayWhereInputArgument = {
  AND?: CalendardayWhereInputArgument[] | undefined,
  NOT?: CalendardayWhereInputArgument | null | undefined,
  OR?: CalendardayWhereInputArgument[] | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  date?: DateTimeWhereInputArgument | null | undefined,
  entries?: CalendarentryWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  sortOrder?: IntWhereInputArgument | null | undefined,
  tracks?: CalendartrackWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Calendarentry = {
  calendarDay: (p?: {
    orderBy?: CalendardayOrderInputArgument | null | undefined,
    where?: CalendardayWhereInputArgument | null | undefined
  }) => Calendarday,
  calendarDayId: ID,
  calendarTrack: (p?: {
    orderBy?: CalendartrackOrderInputArgument | null | undefined,
    where?: CalendartrackWhereInputArgument | null | undefined
  }) => Calendartrack | null,
  calendarTrackId: ID | null,
  color: CalendarentrycolorEnum,
  createdAt: DateTime,
  description: String | null,
  endTime: DateTime,
  fontAwesomeIcon: String | null,
  id: ID,
  name: String,
  place: (p?: {
    orderBy?: PlaceOrderInputArgument | null | undefined,
    where?: PlaceWhereInputArgument | null | undefined
  }) => Place | null,
  placeId: ID | null,
  room: String | null,
  startTime: DateTime,
  updatedAt: DateTime    
};
		
export type CalendarentryOrderInputArgument = {
  calendarDayId?: SortingParameter | null | undefined,
  calendarTrackId?: SortingParameter | null | undefined,
  color?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  endTime?: SortingParameter | null | undefined,
  fontAwesomeIcon?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  placeId?: SortingParameter | null | undefined,
  room?: SortingParameter | null | undefined,
  startTime?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CalendarentryWhereInputArgument = {
  AND?: CalendarentryWhereInputArgument[] | undefined,
  NOT?: CalendarentryWhereInputArgument | null | undefined,
  OR?: CalendarentryWhereInputArgument[] | undefined,
  calendarDay?: CalendardayWhereInputArgument | null | undefined,
  calendarDayId?: IDWhereInputArgument | null | undefined,
  calendarTrack?: CalendartrackWhereInputArgument | null | undefined,
  calendarTrackId?: IDWhereInputArgument | null | undefined,
  color?: CalendarentrycolorEnum | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  endTime?: DateTimeWhereInputArgument | null | undefined,
  fontAwesomeIcon?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  place?: PlaceWhereInputArgument | null | undefined,
  placeId?: IDWhereInputArgument | null | undefined,
  room?: StringWhereInputArgument | null | undefined,
  startTime?: DateTimeWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type CalendarentrycolorEnum = "BREAK" | "CEREMONY" | "HIGHLIGHT" | "INFO" | "LOGISTICS" | "SESSION" | "SOCIAL" | "WORKSHOP";
		
export type Calendartrack = {
  calendarDay: (p?: {
    orderBy?: CalendardayOrderInputArgument | null | undefined,
    where?: CalendardayWhereInputArgument | null | undefined
  }) => Calendarday,
  calendarDayId: ID,
  createdAt: DateTime,
  description: String | null,
  entries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendarentryOrderInputArgument | null | undefined,
    where?: CalendarentryWhereInputArgument | null | undefined
  }) => Calendarentry[],
  id: ID,
  name: String,
  sortOrder: Int,
  updatedAt: DateTime    
};
		
export type CalendartrackOrderInputArgument = {
  calendarDayId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  sortOrder?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CalendartrackWhereInputArgument = {
  AND?: CalendartrackWhereInputArgument[] | undefined,
  NOT?: CalendartrackWhereInputArgument | null | undefined,
  OR?: CalendartrackWhereInputArgument[] | undefined,
  calendarDay?: CalendardayWhereInputArgument | null | undefined,
  calendarDayId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  entries?: CalendarentryWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  sortOrder?: IntWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type CertificateJWT = {
  fullName: String | null,
  jwt: String | null    
};
		
export type CheckEmailInput = {
  email: String    
};
		
export type Committee = {
  CommitteeAgendaItem: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeagendaitemOrderInputArgument | null | undefined,
    where?: CommitteeagendaitemWhereInputArgument | null | undefined
  }) => Committeeagendaitem[],
  abbreviation: String,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  delegationMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  id: ID,
  name: String,
  nations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NationOrderInputArgument | null | undefined,
    where?: NationWhereInputArgument | null | undefined
  }) => Nation[],
  numOfSeatsPerDelegation: Int,
  resolutionHeadline: String | null,
  updatedAt: DateTime    
};
		
export type CommitteeAssignmentInput = {
  committeeId: ID,
  delegationMemberId: ID    
};
		
export type CommitteeOrderInputArgument = {
  abbreviation?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  numOfSeatsPerDelegation?: SortingParameter | null | undefined,
  resolutionHeadline?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CommitteePaperGroup = {
  agendaItems: () => AgendaItemPaperGroup[],
  committee: () => Committee    
};
		
export type CommitteeWhereInputArgument = {
  AND?: CommitteeWhereInputArgument[] | undefined,
  CommitteeAgendaItem?: CommitteeagendaitemWhereInputArgument | null | undefined,
  NOT?: CommitteeWhereInputArgument | null | undefined,
  OR?: CommitteeWhereInputArgument[] | undefined,
  abbreviation?: StringWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  delegationMembers?: DelegationmemberWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  nations?: NationWhereInputArgument | null | undefined,
  numOfSeatsPerDelegation?: IntWhereInputArgument | null | undefined,
  resolutionHeadline?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Committeeagendaitem = {
  committee: (p?: {
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee,
  committeeId: ID,
  createdAt: DateTime,
  id: ID,
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  reviewHelpStatus: ReviewhelpstatusEnum,
  teaserText: String | null,
  title: String,
  updatedAt: DateTime    
};
		
export type CommitteeagendaitemOrderInputArgument = {
  committeeId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  reviewHelpStatus?: SortingParameter | null | undefined,
  teaserText?: SortingParameter | null | undefined,
  title?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CommitteeagendaitemWhereInputArgument = {
  AND?: CommitteeagendaitemWhereInputArgument[] | undefined,
  NOT?: CommitteeagendaitemWhereInputArgument | null | undefined,
  OR?: CommitteeagendaitemWhereInputArgument[] | undefined,
  committee?: CommitteeWhereInputArgument | null | undefined,
  committeeId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  papers?: PaperWhereInputArgument | null | undefined,
  reviewHelpStatus?: ReviewhelpstatusEnum | null | undefined,
  teaserText?: StringWhereInputArgument | null | undefined,
  title?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Conference = {
  WaitingListEntry: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: WaitinglistentryOrderInputArgument | null | undefined,
    where?: WaitinglistentryWhereInputArgument | null | undefined
  }) => Waitinglistentry[],
  accountHolder: String | null,
  bankName: String | null,
  bic: String | null,
  calendarDays: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendardayOrderInputArgument | null | undefined,
    where?: CalendardayWhereInputArgument | null | undefined
  }) => Calendarday[],
  certificateContent: String | null,
  committees: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee[],
  conferenceSupervisors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  conferenceUserStatus: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceparticipantstatusOrderInputArgument | null | undefined,
    where?: ConferenceparticipantstatusWhereInputArgument | null | undefined
  }) => Conferenceparticipantstatus[],
  contractContent: String | null,
  createdAt: DateTime,
  currency: String | null,
  delegationMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  delegations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation[],
  emblemDataURL: String | null,
  endConference: DateTime,
  feeAmount: Float | null,
  guardianConsentContent: String | null,
  iban: String | null,
  id: ID,
  imageDataURL: String | null,
  individualApplicationOptions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CustomconferenceroleOrderInputArgument | null | undefined,
    where?: CustomconferenceroleWhereInputArgument | null | undefined
  }) => Customconferencerole[],
  info: String | null,
  isOpenPaperSubmission: Boolean,
  language: String | null,
  linkToPaperInbox: String | null,
  linkToPreparationGuide: String | null,
  linkToServicesPage: String | null,
  linkToTeamWiki: String | null,
  location: String | null,
  logoDataURL: String | null,
  longTitle: String | null,
  mediaConsentContent: String | null,
  nonStateActors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NonstateactorOrderInputArgument | null | undefined,
    where?: NonstateactorWhereInputArgument | null | undefined
  }) => Nonstateactor[],
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  paymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaymenttransactionOrderInputArgument | null | undefined,
    where?: PaymenttransactionWhereInputArgument | null | undefined
  }) => Paymenttransaction[],
  places: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PlaceOrderInputArgument | null | undefined,
    where?: PlaceWhereInputArgument | null | undefined
  }) => Place[],
  postalApartment: String | null,
  postalCity: String | null,
  postalCountry: String | null,
  postalName: String | null,
  postalStreet: String | null,
  postalZip: String | null,
  registrationDeadlineGracePeriodMinutes: Int,
  showCalendar: Boolean,
  showInfoExpanded: Boolean,
  singleParticipants: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  startAssignment: DateTime,
  startConference: DateTime,
  state: ConferencestateEnum,
  surveyQuestions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyquestionOrderInputArgument | null | undefined,
    where?: SurveyquestionWhereInputArgument | null | undefined
  }) => Surveyquestion[],
  teamMemberInvitations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberinvitationOrderInputArgument | null | undefined,
    where?: TeammemberinvitationWhereInputArgument | null | undefined
  }) => Teammemberinvitation[],
  teamMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberOrderInputArgument | null | undefined,
    where?: TeammemberWhereInputArgument | null | undefined
  }) => Teammember[],
  termsAndConditionsContent: String | null,
  timezone: String,
  title: String,
  unlockPayments: Boolean,
  unlockPostals: Boolean,
  updatedAt: DateTime,
  website: String | null    
};
		
export type ConferenceOrderInputArgument = {
  accountHolder?: SortingParameter | null | undefined,
  bankName?: SortingParameter | null | undefined,
  bic?: SortingParameter | null | undefined,
  certificateContent?: SortingParameter | null | undefined,
  contractContent?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  currency?: SortingParameter | null | undefined,
  emblemDataURL?: SortingParameter | null | undefined,
  endConference?: SortingParameter | null | undefined,
  feeAmount?: SortingParameter | null | undefined,
  guardianConsentContent?: SortingParameter | null | undefined,
  iban?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  imageDataURL?: SortingParameter | null | undefined,
  info?: SortingParameter | null | undefined,
  isOpenPaperSubmission?: SortingParameter | null | undefined,
  language?: SortingParameter | null | undefined,
  linkToPaperInbox?: SortingParameter | null | undefined,
  linkToPreparationGuide?: SortingParameter | null | undefined,
  linkToServicesPage?: SortingParameter | null | undefined,
  linkToTeamWiki?: SortingParameter | null | undefined,
  location?: SortingParameter | null | undefined,
  logoDataURL?: SortingParameter | null | undefined,
  longTitle?: SortingParameter | null | undefined,
  mediaConsentContent?: SortingParameter | null | undefined,
  postalApartment?: SortingParameter | null | undefined,
  postalCity?: SortingParameter | null | undefined,
  postalCountry?: SortingParameter | null | undefined,
  postalName?: SortingParameter | null | undefined,
  postalStreet?: SortingParameter | null | undefined,
  postalZip?: SortingParameter | null | undefined,
  registrationDeadlineGracePeriodMinutes?: SortingParameter | null | undefined,
  showCalendar?: SortingParameter | null | undefined,
  showInfoExpanded?: SortingParameter | null | undefined,
  startAssignment?: SortingParameter | null | undefined,
  startConference?: SortingParameter | null | undefined,
  state?: SortingParameter | null | undefined,
  termsAndConditionsContent?: SortingParameter | null | undefined,
  timezone?: SortingParameter | null | undefined,
  title?: SortingParameter | null | undefined,
  unlockPayments?: SortingParameter | null | undefined,
  unlockPostals?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  website?: SortingParameter | null | undefined    
};
		
export type ConferenceWhereInputArgument = {
  AND?: ConferenceWhereInputArgument[] | undefined,
  NOT?: ConferenceWhereInputArgument | null | undefined,
  OR?: ConferenceWhereInputArgument[] | undefined,
  WaitingListEntry?: WaitinglistentryWhereInputArgument | null | undefined,
  accountHolder?: StringWhereInputArgument | null | undefined,
  bankName?: StringWhereInputArgument | null | undefined,
  bic?: StringWhereInputArgument | null | undefined,
  calendarDays?: CalendardayWhereInputArgument | null | undefined,
  certificateContent?: StringWhereInputArgument | null | undefined,
  committees?: CommitteeWhereInputArgument | null | undefined,
  conferenceSupervisors?: ConferencesupervisorWhereInputArgument | null | undefined,
  conferenceUserStatus?: ConferenceparticipantstatusWhereInputArgument | null | undefined,
  contractContent?: StringWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  currency?: StringWhereInputArgument | null | undefined,
  delegationMembers?: DelegationmemberWhereInputArgument | null | undefined,
  delegations?: DelegationWhereInputArgument | null | undefined,
  emblemDataURL?: StringWhereInputArgument | null | undefined,
  endConference?: DateTimeWhereInputArgument | null | undefined,
  feeAmount?: FloatWhereInputArgument | null | undefined,
  guardianConsentContent?: StringWhereInputArgument | null | undefined,
  iban?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  imageDataURL?: StringWhereInputArgument | null | undefined,
  individualApplicationOptions?: CustomconferenceroleWhereInputArgument | null | undefined,
  info?: StringWhereInputArgument | null | undefined,
  isOpenPaperSubmission?: BooleanWhereInputArgument | null | undefined,
  language?: StringWhereInputArgument | null | undefined,
  linkToPaperInbox?: StringWhereInputArgument | null | undefined,
  linkToPreparationGuide?: StringWhereInputArgument | null | undefined,
  linkToServicesPage?: StringWhereInputArgument | null | undefined,
  linkToTeamWiki?: StringWhereInputArgument | null | undefined,
  location?: StringWhereInputArgument | null | undefined,
  logoDataURL?: StringWhereInputArgument | null | undefined,
  longTitle?: StringWhereInputArgument | null | undefined,
  mediaConsentContent?: StringWhereInputArgument | null | undefined,
  nonStateActors?: NonstateactorWhereInputArgument | null | undefined,
  papers?: PaperWhereInputArgument | null | undefined,
  paymentTransactions?: PaymenttransactionWhereInputArgument | null | undefined,
  places?: PlaceWhereInputArgument | null | undefined,
  postalApartment?: StringWhereInputArgument | null | undefined,
  postalCity?: StringWhereInputArgument | null | undefined,
  postalCountry?: StringWhereInputArgument | null | undefined,
  postalName?: StringWhereInputArgument | null | undefined,
  postalStreet?: StringWhereInputArgument | null | undefined,
  postalZip?: StringWhereInputArgument | null | undefined,
  registrationDeadlineGracePeriodMinutes?: IntWhereInputArgument | null | undefined,
  showCalendar?: BooleanWhereInputArgument | null | undefined,
  showInfoExpanded?: BooleanWhereInputArgument | null | undefined,
  singleParticipants?: SingleparticipantWhereInputArgument | null | undefined,
  startAssignment?: DateTimeWhereInputArgument | null | undefined,
  startConference?: DateTimeWhereInputArgument | null | undefined,
  state?: ConferencestateEnum | null | undefined,
  surveyQuestions?: SurveyquestionWhereInputArgument | null | undefined,
  teamMemberInvitations?: TeammemberinvitationWhereInputArgument | null | undefined,
  teamMembers?: TeammemberWhereInputArgument | null | undefined,
  termsAndConditionsContent?: StringWhereInputArgument | null | undefined,
  timezone?: StringWhereInputArgument | null | undefined,
  title?: StringWhereInputArgument | null | undefined,
  unlockPayments?: BooleanWhereInputArgument | null | undefined,
  unlockPostals?: BooleanWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  website?: StringWhereInputArgument | null | undefined    
};
		
export type Conferenceparticipantstatus = {
  accessCardId: ID | null,
  assigendDocumentNumber: Int | null,
  attendanceEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: AttendanceentryOrderInputArgument | null | undefined,
    where?: AttendanceentryWhereInputArgument | null | undefined
  }) => Attendanceentry[],
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  didAttend: Boolean,
  guardianConsent: AdministrativestatusEnum,
  id: ID,
  mediaConsent: AdministrativestatusEnum,
  mediaConsentStatus: MediaconsentstatusEnum,
  paymentStatus: AdministrativestatusEnum,
  termsAndConditions: AdministrativestatusEnum,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type ConferenceparticipantstatusOrderInputArgument = {
  accessCardId?: SortingParameter | null | undefined,
  assigendDocumentNumber?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  didAttend?: SortingParameter | null | undefined,
  guardianConsent?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  mediaConsent?: SortingParameter | null | undefined,
  mediaConsentStatus?: SortingParameter | null | undefined,
  paymentStatus?: SortingParameter | null | undefined,
  termsAndConditions?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type ConferenceparticipantstatusWhereInputArgument = {
  AND?: ConferenceparticipantstatusWhereInputArgument[] | undefined,
  NOT?: ConferenceparticipantstatusWhereInputArgument | null | undefined,
  OR?: ConferenceparticipantstatusWhereInputArgument[] | undefined,
  accessCardId?: IDWhereInputArgument | null | undefined,
  assigendDocumentNumber?: IntWhereInputArgument | null | undefined,
  attendanceEntries?: AttendanceentryWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  didAttend?: BooleanWhereInputArgument | null | undefined,
  guardianConsent?: AdministrativestatusEnum | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  mediaConsent?: AdministrativestatusEnum | null | undefined,
  mediaConsentStatus?: MediaconsentstatusEnum | null | undefined,
  paymentStatus?: AdministrativestatusEnum | null | undefined,
  termsAndConditions?: AdministrativestatusEnum | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type ConferencestateEnum = "ACTIVE" | "PARTICIPANT_REGISTRATION" | "POST" | "PRE" | "PREPARATION";
		
export type Conferencesupervisor = {
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  connectionCode: String,
  createdAt: DateTime,
  id: ID,
  plansOwnAttendenceAtConference: Boolean,
  supervisedDelegationMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  supervisedSingleParticipants: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type ConferencesupervisorOrderInputArgument = {
  conferenceId?: SortingParameter | null | undefined,
  connectionCode?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  plansOwnAttendenceAtConference?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type ConferencesupervisorWhereInputArgument = {
  AND?: ConferencesupervisorWhereInputArgument[] | undefined,
  NOT?: ConferencesupervisorWhereInputArgument | null | undefined,
  OR?: ConferencesupervisorWhereInputArgument[] | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  connectionCode?: StringWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  plansOwnAttendenceAtConference?: BooleanWhereInputArgument | null | undefined,
  supervisedDelegationMembers?: DelegationmemberWhereInputArgument | null | undefined,
  supervisedSingleParticipants?: SingleparticipantWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type CreateInvitationInput = {
  email: String,
  role: TeamroleEnum    
};
		
export type CreateInvitationsResult = {
  created: () => CreatedInvitation[],
  errors: () => InvitationError[]    
};
		
export type CreatePaperReviewResult = {
  pieceUnlocked: Boolean,
  reviewId: String,
  unlockedPieceData: () => UnlockedPieceData | null    
};
		
export type CreatedInvitation = {
  addedDirectly: Boolean,
  email: String,
  expiresAt: DateTime,
  id: String,
  role: String,
  token: String | null    
};
		
export type Customconferencerole = {
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  description: String,
  fontAwesomeIcon: String | null,
  id: ID,
  name: String,
  seatAmount: Int,
  singleParticipant: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  singleParticipantAssignments: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  updatedAt: DateTime    
};
		
export type CustomconferenceroleOrderInputArgument = {
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  fontAwesomeIcon?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  seatAmount?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type CustomconferenceroleWhereInputArgument = {
  AND?: CustomconferenceroleWhereInputArgument[] | undefined,
  NOT?: CustomconferenceroleWhereInputArgument | null | undefined,
  OR?: CustomconferenceroleWhereInputArgument[] | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  fontAwesomeIcon?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  seatAmount?: IntWhereInputArgument | null | undefined,
  singleParticipant?: SingleparticipantWhereInputArgument | null | undefined,
  singleParticipantAssignments?: SingleparticipantWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type DateTime = Date;
		
export type DateTimeWhereInputArgument = {
  AND?: DateTimeWhereInputArgument[] | undefined,
  NOT?: DateTimeWhereInputArgument | null | undefined,
  OR?: DateTimeWhereInputArgument[] | undefined,
  arrayContained?: DateTime[] | undefined,
  arrayContains?: DateTime[] | undefined,
  arrayOverlaps?: DateTime[] | undefined,
  eq?: DateTime | null | undefined,
  gt?: DateTime | null | undefined,
  gte?: DateTime | null | undefined,
  in?: DateTime[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  lt?: DateTime | null | undefined,
  lte?: DateTime | null | undefined,
  ne?: DateTime | null | undefined,
  notIn?: DateTime[] | undefined    
};
		
export type DateWhereInputArgument = {
  AND?: DateWhereInputArgument[] | undefined,
  NOT?: DateWhereInputArgument | null | undefined,
  OR?: DateWhereInputArgument[] | undefined,
  arrayContained?: Date[] | undefined,
  arrayContains?: Date[] | undefined,
  arrayOverlaps?: Date[] | undefined,
  eq?: Date | null | undefined,
  gt?: Date | null | undefined,
  gte?: Date | null | undefined,
  ilike?: String | null | undefined,
  in?: Date[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  like?: String | null | undefined,
  lt?: Date | null | undefined,
  lte?: Date | null | undefined,
  ne?: Date | null | undefined,
  notIlike?: String | null | undefined,
  notIn?: Date[] | undefined,
  notLike?: String | null | undefined    
};
		
export type Delegation = {
  applied: Boolean,
  appliedForRoles: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: RoleapplicationOrderInputArgument | null | undefined,
    where?: RoleapplicationWhereInputArgument | null | undefined
  }) => Roleapplication[],
  assignedNation: (p?: {
    orderBy?: NationOrderInputArgument | null | undefined,
    where?: NationWhereInputArgument | null | undefined
  }) => Nation | null,
  assignedNationAlpha3Code: String | null,
  assignedNonStateActor: (p?: {
    orderBy?: NonstateactorOrderInputArgument | null | undefined,
    where?: NonstateactorWhereInputArgument | null | undefined
  }) => Nonstateactor | null,
  assignedNonStateActorId: ID | null,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  entryCode: String,
  experience: String | null,
  id: ID,
  members: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  motivation: String | null,
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  school: String | null,
  updatedAt: DateTime    
};
		
export type DelegationOrderInputArgument = {
  applied?: SortingParameter | null | undefined,
  assignedNationAlpha3Code?: SortingParameter | null | undefined,
  assignedNonStateActorId?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  entryCode?: SortingParameter | null | undefined,
  experience?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  motivation?: SortingParameter | null | undefined,
  school?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type DelegationPreview = {
  applied: Boolean,
  conferenceId: String,
  conferenceTitle: String,
  entryCode: String,
  experience: String | null,
  headDelegateFullName: String,
  id: String,
  memberCount: Int,
  motivation: String | null,
  school: String | null    
};
		
export type DelegationWhereInputArgument = {
  AND?: DelegationWhereInputArgument[] | undefined,
  NOT?: DelegationWhereInputArgument | null | undefined,
  OR?: DelegationWhereInputArgument[] | undefined,
  applied?: BooleanWhereInputArgument | null | undefined,
  appliedForRoles?: RoleapplicationWhereInputArgument | null | undefined,
  assignedNation?: NationWhereInputArgument | null | undefined,
  assignedNationAlpha3Code?: StringWhereInputArgument | null | undefined,
  assignedNonStateActor?: NonstateactorWhereInputArgument | null | undefined,
  assignedNonStateActorId?: IDWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  entryCode?: StringWhereInputArgument | null | undefined,
  experience?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  members?: DelegationmemberWhereInputArgument | null | undefined,
  motivation?: StringWhereInputArgument | null | undefined,
  papers?: PaperWhereInputArgument | null | undefined,
  school?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Delegationmember = {
  assignedCommittee: (p?: {
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee | null,
  assignedCommitteeId: ID | null,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  delegation: (p?: {
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation,
  delegationId: ID,
  id: ID,
  isHeadDelegate: Boolean,
  supervisors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type DelegationmemberOrderInputArgument = {
  assignedCommitteeId?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  delegationId?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  isHeadDelegate?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type DelegationmemberWhereInputArgument = {
  AND?: DelegationmemberWhereInputArgument[] | undefined,
  NOT?: DelegationmemberWhereInputArgument | null | undefined,
  OR?: DelegationmemberWhereInputArgument[] | undefined,
  assignedCommittee?: CommitteeWhereInputArgument | null | undefined,
  assignedCommitteeId?: IDWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  delegation?: DelegationWhereInputArgument | null | undefined,
  delegationId?: IDWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  isHeadDelegate?: BooleanWhereInputArgument | null | undefined,
  supervisors?: ConferencesupervisorWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type EmailAddress = unknown;
		
export type EmailStatusResult = {
  email: String,
  pendingInvitationId: String | null,
  status: String,
  userId: String | null    
};
		
export type FlagCollectionData = {
  flags: () => FlagProgress[],
  stats: () => FlagCollectionStats    
};
		
export type FlagCollectionStats = {
  completedFlags: Int,
  foundPieces: Int,
  totalFlags: Int,
  totalPieces: Int,
  unlockedPieces: Int    
};
		
export type FlagPiece = {
  agendaItemId: String | null,
  agendaItemTitle: String | null,
  committeeAbbreviation: String | null,
  id: String,
  state: FlagPieceState    
};
		
export type FlagPieceState = "FOUND" | "LOCKED" | "UNLOCKED";
		
export type FlagProgress = {
  abbreviation: String | null,
  alpha2Code: String | null,
  alpha3Code: String | null,
  fontAwesomeIcon: String | null,
  foundPieces: Int,
  id: String,
  isComplete: Boolean,
  name: String,
  pieces: () => FlagPiece[],
  totalPieces: Int,
  type: FlagType,
  unlockedPieces: Int    
};
		
export type FlagType = "NATION" | "NSA";
		
export type Float = number;
		
export type FloatWhereInputArgument = {
  AND?: FloatWhereInputArgument[] | undefined,
  NOT?: FloatWhereInputArgument | null | undefined,
  OR?: FloatWhereInputArgument[] | undefined,
  arrayContained?: Float[] | undefined,
  arrayContains?: Float[] | undefined,
  arrayOverlaps?: Float[] | undefined,
  eq?: Float | null | undefined,
  gt?: Float | null | undefined,
  gte?: Float | null | undefined,
  ilike?: String | null | undefined,
  in?: Float[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  like?: String | null | undefined,
  lt?: Float | null | undefined,
  lte?: Float | null | undefined,
  ne?: Float | null | undefined,
  notIlike?: String | null | undefined,
  notIn?: Float[] | undefined,
  notLike?: String | null | undefined    
};
		
export type FoodpreferenceEnum = "OMNIVORE" | "VEGAN" | "VEGETARIAN";
		
export type GenderEnum = "DIVERSE" | "FEMALE" | "MALE" | "NO_STATEMENT";
		
export type ID = string;
		
export type IDWhereInputArgument = {
  AND?: IDWhereInputArgument[] | undefined,
  NOT?: IDWhereInputArgument | null | undefined,
  OR?: IDWhereInputArgument[] | undefined,
  arrayContained?: ID[] | undefined,
  arrayContains?: ID[] | undefined,
  arrayOverlaps?: ID[] | undefined,
  eq?: ID | null | undefined,
  gt?: ID | null | undefined,
  gte?: ID | null | undefined,
  ilike?: String | null | undefined,
  in?: ID[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  like?: String | null | undefined,
  lt?: ID | null | undefined,
  lte?: ID | null | undefined,
  ne?: ID | null | undefined,
  notIlike?: String | null | undefined,
  notIn?: ID[] | undefined,
  notLike?: String | null | undefined    
};
		
export type ImpersonationStatus = {
  impersonatedUser: () => ImpersonationUser | null,
  isImpersonating: Boolean,
  originalUser: () => ImpersonationUser | null    
};
		
export type ImpersonationUser = {
  email: String,
  family_name: String | null,
  given_name: String | null,
  preferred_username: String | null,
  sub: String    
};
		
export type Int = number;
		
export type IntWhereInputArgument = {
  AND?: IntWhereInputArgument[] | undefined,
  NOT?: IntWhereInputArgument | null | undefined,
  OR?: IntWhereInputArgument[] | undefined,
  arrayContained?: Int[] | undefined,
  arrayContains?: Int[] | undefined,
  arrayOverlaps?: Int[] | undefined,
  eq?: Int | null | undefined,
  gt?: Int | null | undefined,
  gte?: Int | null | undefined,
  ilike?: String | null | undefined,
  in?: Int[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  like?: String | null | undefined,
  lt?: Int | null | undefined,
  lte?: Int | null | undefined,
  ne?: Int | null | undefined,
  notIlike?: String | null | undefined,
  notIn?: Int[] | undefined,
  notLike?: String | null | undefined    
};
		
export type InvitationError = {
  email: String,
  error: String    
};
		
export type JSON = any;
		
export type JSONWhereInputArgument = {
  AND?: JSONWhereInputArgument[] | undefined,
  NOT?: JSONWhereInputArgument | null | undefined,
  OR?: JSONWhereInputArgument[] | undefined,
  arrayContained?: JSON[] | undefined,
  arrayContains?: JSON[] | undefined,
  arrayOverlaps?: JSON[] | undefined,
  eq?: JSON | null | undefined,
  in?: JSON[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  ne?: JSON | null | undefined,
  notIn?: JSON[] | undefined    
};
		
export type JWK = {
  alg: String | null,
  crv: String | null,
  d: String | null,
  dp: String | null,
  dq: String | null,
  e: String | null,
  k: String | null,
  kty: String | null,
  n: String | null,
  p: String | null,
  q: String | null,
  qi: String | null,
  use: String | null,
  x: String | null,
  y: String | null    
};
		
export type Locale = unknown;
		
export type MediaconsentstatusEnum = "ALLOWED_ALL" | "NOT_ALLOWED" | "NOT_SET" | "PARTIALLY_ALLOWED";
		
export type Mutation = {
  assignCommitteesToDelegationMembers: (p: {
    assignments: CommitteeAssignmentInput[],
    conferenceId: ID
  }) => Delegationmember[],
  connectToConferenceSupervisor: (p: {
    conferenceId: ID,
    connectionCode: String,
    userId?: ID | null | undefined
  }) => Conferencesupervisor,
  createAgendaItem: (p: {
    committeeId: ID,
    teaserText?: String | null | undefined,
    title: String
  }) => Committeeagendaitem,
  createAppliedDelegationMember: (p: {
    assignedCommitteeId?: ID | null | undefined,
    assignedNationAlpha3Code?: String | null | undefined,
    assignedNonStateActorId?: ID | null | undefined,
    conferenceId: ID,
    userId: ID
  }) => Delegationmember,
  createAppliedSingleParticipant: (p: {
    conferenceId: ID,
    roleId: ID,
    userId: ID
  }) => Singleparticipant,
  createAttendanceEntry: (p: {
    conferenceId: ID,
    occasion: String,
    userId: ID
  }) => Attendanceentry,
  createCalendarDay: (p: {
    conferenceId: ID,
    date: DateTime,
    name: String,
    sortOrder: Int
  }) => Calendarday,
  createCalendarEntry: (p: {
    calendarDayId: ID,
    calendarTrackId?: ID | null | undefined,
    color?: CalendarentrycolorEnum | null | undefined,
    description?: String | null | undefined,
    endTime: DateTime,
    fontAwesomeIcon?: String | null | undefined,
    name: String,
    placeId?: ID | null | undefined,
    room?: String | null | undefined,
    startTime: DateTime
  }) => Calendarentry,
  createCalendarTrack: (p: {
    calendarDayId: ID,
    description?: String | null | undefined,
    name: String,
    sortOrder: Int
  }) => Calendartrack,
  createConferenceSupervisor: (p: {
    conferenceId: ID,
    plansOwnAttendenceAtConference?: Boolean | null | undefined,
    userId?: ID | null | undefined
  }) => Conferencesupervisor,
  createDelegation: (p: {
    conferenceId: ID,
    experience?: String | null | undefined,
    motivation?: String | null | undefined,
    school?: String | null | undefined
  }) => Delegation,
  createDelegationMember: (p: {
    conferenceId: ID,
    entryCode: String
  }) => Delegationmember,
  createPaper: (p: {
    agendaItemId?: ID | null | undefined,
    authorId: ID,
    conferenceId: ID,
    content: JSON,
    delegationId: ID,
    status?: PaperstatusEnum | null | undefined,
    type: PapertypeEnum
  }) => Paper,
  createPaperReview: (p: {
    comments: JSON,
    newStatus: PaperstatusEnum,
    paperId: ID
  }) => CreatePaperReviewResult,
  createPaymentTransaction: (p: {
    conferenceId: ID,
    paymentFor: ID[],
    userId: ID
  }) => Paymenttransaction,
  createPlace: (p: {
    address?: String | null | undefined,
    conferenceId: ID,
    directions?: String | null | undefined,
    info?: String | null | undefined,
    latitude?: Float | null | undefined,
    longitude?: Float | null | undefined,
    name: String,
    sitePlanDataURL?: String | null | undefined,
    websiteUrl?: String | null | undefined
  }) => Place,
  createReviewerSnippet: (p: {
    content: JSON,
    name: String
  }) => Reviewersnippet,
  createRoleApplication: (p: {
    delegationId: ID,
    nationId?: ID | null | undefined,
    nonStateActorId?: ID | null | undefined
  }) => Roleapplication,
  createSingleParticipant: (p: {
    conferenceId: ID,
    experience?: String | null | undefined,
    motivation?: String | null | undefined,
    roleId: ID,
    school?: String | null | undefined
  }) => Singleparticipant,
  createSurveyOption: (p: {
    description: String,
    questionId: ID,
    title: String,
    upperLimit: Int
  }) => Surveyoption,
  createSurveyQuestion: (p: {
    conferenceId: ID,
    deadline: DateTime,
    description: String,
    draft?: Boolean | null | undefined,
    hidden?: Boolean | null | undefined,
    showSelectionOnDashboard?: Boolean | null | undefined,
    title: String
  }) => Surveyquestion,
  createTeamMember: (p: {
    conferenceId: ID,
    role?: TeamroleEnum | null | undefined,
    userId: ID
  }) => Teammember,
  createTeamMemberInvitations: (p: {
    conferenceId: ID,
    invitations: CreateInvitationInput[]
  }) => CreateInvitationsResult,
  createWaitingListEntry: (p: {
    conferenceId: ID,
    experience: String,
    motivation: String,
    requests?: String | null | undefined,
    school: String
  }) => Waitinglistentry,
  deleteAgendaItem: (p: {
    id: ID
  }) => Boolean,
  deleteAttendanceEntry: (p: {
    id: ID
  }) => Boolean,
  deleteCalendarDay: (p: {
    id: ID
  }) => Boolean,
  deleteCalendarEntry: (p: {
    id: ID
  }) => Boolean,
  deleteCalendarTrack: (p: {
    id: ID
  }) => Boolean,
  deleteCommittee: (p: {
    id: ID
  }) => Boolean,
  deleteConference: (p: {
    id: ID
  }) => Boolean,
  deleteConferenceParticipantStatus: (p: {
    id: ID
  }) => Boolean,
  deleteConferenceSupervisor: (p: {
    id: ID
  }) => Boolean,
  deleteCustomConferenceRole: (p: {
    id: ID
  }) => Boolean,
  deleteDeadDelegationMembers: (p: {
    conferenceId: ID
  }) => Delegationmember[],
  deleteDeadSingleParticipants: (p: {
    conferenceId: ID
  }) => Singleparticipant[],
  deleteDeadSupervisors: (p: {
    conferenceId: ID
  }) => Conferencesupervisor[],
  deleteDelegation: (p: {
    id: ID
  }) => Boolean,
  deleteDelegationMember: (p: {
    id: ID
  }) => Boolean,
  deleteEmptyDelegations: (p: {
    conferenceId: ID
  }) => Delegation[],
  deleteNation: (p: {
    alpha3Code: ID
  }) => Boolean,
  deleteNonStateActor: (p: {
    id: ID
  }) => Boolean,
  deletePaper: (p: {
    id: ID
  }) => Boolean,
  deletePlace: (p: {
    id: ID
  }) => Boolean,
  deleteReviewerSnippet: (p: {
    id: ID
  }) => Boolean,
  deleteRoleApplication: (p: {
    id: ID
  }) => Boolean,
  deleteSingleParticipant: (p: {
    id: ID
  }) => Boolean,
  deleteSurveyOption: (p: {
    id: ID
  }) => Boolean,
  deleteSurveyQuestion: (p: {
    id: ID
  }) => Boolean,
  deleteTeamMember: (p: {
    id: ID
  }) => Boolean,
  deleteUser: (p: {
    id: ID
  }) => Boolean,
  deleteWaitingListEntry: (p: {
    id: ID
  }) => Boolean,
  importCalendarDay: (p: {
    conferenceId: ID,
    date: DateTime,
    importData: JSON,
    name: String,
    sortOrder: Int
  }) => Calendarday,
  normalizeSchoolsInConference: (p: {
    conferenceId: ID,
    newSchoolName: String,
    schoolsToMerge: String[]
  }) => Conference,
  regenerateTeamMemberInvitation: (p: {
    invitationId: ID,
    sendEmail?: Boolean | null | undefined
  }) => RegenerateInvitationResult,
  revokeTeamMemberInvitation: (p: {
    invitationId: ID
  }) => RevokeInvitationResult,
  rotateSupervisorConnectionCode: (p: {
    id: ID
  }) => Conferencesupervisor,
  seedNewConference: (p: {
    data: JSON
  }) => Conference,
  sendAssignmentData: (p: {
    conferenceId: ID,
    data: JSON
  }) => Boolean,
  setAgendaItemReviewHelpStatus: (p: {
    agendaItemId: ID,
    status: ReviewhelpstatusEnum
  }) => Committeeagendaitem,
  startImpersonation: (p: {
    scope?: String | null | undefined,
    targetUserId: ID
  }) => Boolean,
  swapRoleApplicationRanks: (p: {
    firstRoleApplicationId: ID,
    secondRoleApplicationId: ID
  }) => Roleapplication[],
  unregisterParticipant: (p: {
    conferenceId: ID,
    userId: ID
  }) => User,
  updateAgendaItem: (p: {
    id: ID,
    teaserText?: String | null | undefined,
    title?: String | null | undefined
  }) => Committeeagendaitem,
  updateAllConferenceParticipantStatus: (p: {
    conferenceId: ID,
    didAttend?: Boolean | null | undefined
  }) => String[],
  updateCalendarDay: (p: {
    date?: DateTime | null | undefined,
    id: ID,
    name?: String | null | undefined,
    sortOrder?: Int | null | undefined
  }) => Calendarday,
  updateCalendarEntry: (p: {
    calendarTrackId?: ID | null | undefined,
    color?: CalendarentrycolorEnum | null | undefined,
    description?: String | null | undefined,
    endTime?: DateTime | null | undefined,
    fontAwesomeIcon?: String | null | undefined,
    id: ID,
    name?: String | null | undefined,
    placeId?: ID | null | undefined,
    room?: String | null | undefined,
    startTime?: DateTime | null | undefined
  }) => Calendarentry,
  updateCalendarTrack: (p: {
    description?: String | null | undefined,
    id: ID,
    name?: String | null | undefined,
    sortOrder?: Int | null | undefined
  }) => Calendartrack,
  updateCommittee: (p: {
    abbreviation?: String | null | undefined,
    id: ID,
    name?: String | null | undefined,
    resolutionHeadline?: String | null | undefined
  }) => Committee,
  updateConference: (p: {
    accountHolder?: String | null | undefined,
    bankName?: String | null | undefined,
    bic?: String | null | undefined,
    certificateContent?: String | null | undefined,
    contractContent?: String | null | undefined,
    currency?: String | null | undefined,
    emblemDataURL?: String | null | undefined,
    endConference?: DateTime | null | undefined,
    feeAmount?: Float | null | undefined,
    guardianConsentContent?: String | null | undefined,
    iban?: String | null | undefined,
    id: ID,
    imageDataURL?: String | null | undefined,
    info?: String | null | undefined,
    isOpenPaperSubmission?: Boolean | null | undefined,
    language?: String | null | undefined,
    linkToPaperInbox?: String | null | undefined,
    linkToPreparationGuide?: String | null | undefined,
    linkToServicesPage?: String | null | undefined,
    linkToTeamWiki?: String | null | undefined,
    location?: String | null | undefined,
    logoDataURL?: String | null | undefined,
    longTitle?: String | null | undefined,
    mediaConsentContent?: String | null | undefined,
    postalApartment?: String | null | undefined,
    postalCity?: String | null | undefined,
    postalCountry?: String | null | undefined,
    postalName?: String | null | undefined,
    postalStreet?: String | null | undefined,
    postalZip?: String | null | undefined,
    registrationDeadlineGracePeriodMinutes?: Int | null | undefined,
    showCalendar?: Boolean | null | undefined,
    showInfoExpanded?: Boolean | null | undefined,
    startAssignment?: DateTime | null | undefined,
    startConference?: DateTime | null | undefined,
    state?: ConferencestateEnum | null | undefined,
    termsAndConditionsContent?: String | null | undefined,
    timezone?: String | null | undefined,
    title?: String | null | undefined,
    unlockPayments?: Boolean | null | undefined,
    unlockPostals?: Boolean | null | undefined,
    website?: String | null | undefined
  }) => Conference,
  updateConferenceParticipantStatus: (p: {
    accessCardId?: String | null | undefined,
    assignNextDocumentNumber?: Boolean | null | undefined,
    assignedDocumentNumber?: Int | null | undefined,
    conferenceId: ID,
    didAttend?: Boolean | null | undefined,
    guardianConsent?: AdministrativestatusEnum | null | undefined,
    id?: ID | null | undefined,
    mediaConsent?: AdministrativestatusEnum | null | undefined,
    mediaConsentStatus?: MediaconsentstatusEnum | null | undefined,
    paymentStatus?: AdministrativestatusEnum | null | undefined,
    termsAndConditions?: AdministrativestatusEnum | null | undefined,
    userEmail?: String | null | undefined,
    userId?: ID | null | undefined
  }) => Conferenceparticipantstatus,
  updateConferenceSupervisor: (p: {
    id: ID,
    plansOwnAttendenceAtConference?: Boolean | null | undefined
  }) => Conferencesupervisor,
  updateCustomConferenceRole: (p: {
    description?: String | null | undefined,
    fontAwesomeIcon?: String | null | undefined,
    id: ID,
    name?: String | null | undefined,
    seatAmount?: Int | null | undefined
  }) => Customconferencerole,
  updateDelegation: (p: {
    applied?: Boolean | null | undefined,
    experience?: String | null | undefined,
    id: ID,
    motivation?: String | null | undefined,
    newHeadDelegateUserId?: ID | null | undefined,
    resetEntryCode?: Boolean | null | undefined,
    school?: String | null | undefined
  }) => Delegation,
  updateDelegationMemberCommittee: (p: {
    assignedCommitteeId: ID,
    id: ID
  }) => Delegationmember,
  updateManyDelegationMemberCommittee: (p: {
    assignedCommitteeId?: ID | null | undefined,
    conferenceId: ID,
    ids: ID[]
  }) => Int,
  updatePaper: (p: {
    content: JSON,
    paperId: ID,
    status?: PaperstatusEnum | null | undefined
  }) => Paper,
  updatePaymentTransaction: (p: {
    assignedStatus: AdministrativestatusEnum,
    id: ID,
    recievedAt?: DateTime | null | undefined
  }) => Paymenttransaction,
  updatePlace: (p: {
    address?: String | null | undefined,
    directions?: String | null | undefined,
    id: ID,
    info?: String | null | undefined,
    latitude?: Float | null | undefined,
    longitude?: Float | null | undefined,
    name?: String | null | undefined,
    sitePlanDataURL?: String | null | undefined,
    websiteUrl?: String | null | undefined
  }) => Place,
  updateReviewerSnippet: (p: {
    content: JSON,
    id: ID,
    name: String
  }) => Reviewersnippet,
  updateSingleParticipant: (p: {
    applied?: Boolean | null | undefined,
    applyForRolesIdList?: ID[] | null | undefined,
    experience?: String | null | undefined,
    id: ID,
    motivation?: String | null | undefined,
    school?: String | null | undefined,
    unApplyForRolesIdList?: ID[] | null | undefined
  }) => Singleparticipant,
  updateSurveyAnswer: (p: {
    id: ID,
    optionId: ID
  }) => Surveyanswer,
  updateSurveyOption: (p: {
    description?: String | null | undefined,
    id: ID,
    title?: String | null | undefined,
    upperLimit?: Int | null | undefined
  }) => Surveyoption,
  updateSurveyQuestion: (p: {
    deadline?: DateTime | null | undefined,
    description?: String | null | undefined,
    draft?: Boolean | null | undefined,
    hidden?: Boolean | null | undefined,
    id: ID,
    showSelectionOnDashboard?: Boolean | null | undefined,
    title?: String | null | undefined
  }) => Surveyquestion,
  updateTeamMember: (p: {
    id: ID,
    role: TeamroleEnum
  }) => Teammember,
  updateUser: (p: {
    apartment?: String | null | undefined,
    birthday: DateTime,
    city: String,
    country: String,
    emergencyContacts: String,
    familyName: String,
    foodPreference: FoodpreferenceEnum,
    gender: GenderEnum,
    givenName: String,
    id: ID,
    phone: String,
    pronouns?: String | null | undefined,
    street: String,
    wantsJoinTeamInformation?: Boolean | null | undefined,
    wantsToReceiveGeneralInformation?: Boolean | null | undefined,
    zip: String
  }) => User,
  updateUsersGlobalNotes: (p: {
    globalNotes: String,
    id: ID
  }) => User,
  updateUsersIdentityInfo: (p: {
    birthday?: DateTime | null | undefined,
    familyName?: String | null | undefined,
    givenName?: String | null | undefined,
    id: ID
  }) => User,
  updateUsersNewsletterPreferences: (p: {
    email: String,
    wantsJoinTeamInformation?: Boolean | null | undefined,
    wantsToReceiveGeneralInformation?: Boolean | null | undefined
  }) => User,
  updateWaitingListEntry: (p: {
    assigned?: Boolean | null | undefined,
    experience?: String | null | undefined,
    hidden?: Boolean | null | undefined,
    id: ID,
    motivation?: String | null | undefined,
    requests?: String | null | undefined,
    school?: String | null | undefined
  }) => Waitinglistentry    
};
		
export type MyReviewStats = {
  firstReviews: Int,
  followUpReviews: Int,
  totalReviews: Int    
};
		
export type Nation = {
  alpha2Code: String,
  alpha3Code: String,
  assignedDelegations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation[],
  committees: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee[],
  createdAt: DateTime,
  roleApplications: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: RoleapplicationOrderInputArgument | null | undefined,
    where?: RoleapplicationWhereInputArgument | null | undefined
  }) => Roleapplication[],
  updatedAt: DateTime    
};
		
export type NationOrderInputArgument = {
  alpha2Code?: SortingParameter | null | undefined,
  alpha3Code?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type NationWhereInputArgument = {
  AND?: NationWhereInputArgument[] | undefined,
  NOT?: NationWhereInputArgument | null | undefined,
  OR?: NationWhereInputArgument[] | undefined,
  alpha2Code?: StringWhereInputArgument | null | undefined,
  alpha3Code?: StringWhereInputArgument | null | undefined,
  assignedDelegations?: DelegationWhereInputArgument | null | undefined,
  committees?: CommitteeWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  roleApplications?: RoleapplicationWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Nonstateactor = {
  abbreviation: String,
  assignedDelegations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation[],
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  description: String,
  fontAwesomeIcon: String | null,
  id: ID,
  name: String,
  roleApplications: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: RoleapplicationOrderInputArgument | null | undefined,
    where?: RoleapplicationWhereInputArgument | null | undefined
  }) => Roleapplication[],
  seatAmount: Int,
  updatedAt: DateTime    
};
		
export type NonstateactorOrderInputArgument = {
  abbreviation?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  fontAwesomeIcon?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  seatAmount?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type NonstateactorWhereInputArgument = {
  AND?: NonstateactorWhereInputArgument[] | undefined,
  NOT?: NonstateactorWhereInputArgument | null | undefined,
  OR?: NonstateactorWhereInputArgument[] | undefined,
  abbreviation?: StringWhereInputArgument | null | undefined,
  assignedDelegations?: DelegationWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  fontAwesomeIcon?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  roleApplications?: RoleapplicationWhereInputArgument | null | undefined,
  seatAmount?: IntWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type OIDCRolesEnum = "admin" | "member" | "service_user";
		
export type OfflineUser = {
  email: String,
  family_name: String | null,
  given_name: String | null,
  hasPassword: Boolean | null,
  locale: String | null,
  mfaVerificationFactors: String[],
  phone: String | null,
  preferred_username: String | null,
  socialIdentities: String[],
  ssoIdentities: () => OfflineUserSsoIdentity[],
  sub: String    
};
		
export type OfflineUserRefresh = {
  nextTokenRefreshDue: DateTime | null,
  user: () => OfflineUser | null    
};
		
export type OfflineUserSsoIdentity = {
  identityId: String,
  issuer: String    
};
		
export type Paper = {
  agendaItem: (p?: {
    orderBy?: CommitteeagendaitemOrderInputArgument | null | undefined,
    where?: CommitteeagendaitemWhereInputArgument | null | undefined
  }) => Committeeagendaitem | null,
  agendaItemId: ID | null,
  author: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  authorId: ID,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  delegation: (p?: {
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation,
  delegationId: ID,
  firstSubmittedAt: DateTime | null,
  id: ID,
  status: PaperstatusEnum,
  type: PapertypeEnum,
  updatedAt: DateTime,
  versions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperversionOrderInputArgument | null | undefined,
    where?: PaperversionWhereInputArgument | null | undefined
  }) => Paperversion[]    
};
		
export type PaperOrderInputArgument = {
  agendaItemId?: SortingParameter | null | undefined,
  authorId?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  delegationId?: SortingParameter | null | undefined,
  firstSubmittedAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  status?: SortingParameter | null | undefined,
  type?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type PaperWhereInputArgument = {
  AND?: PaperWhereInputArgument[] | undefined,
  NOT?: PaperWhereInputArgument | null | undefined,
  OR?: PaperWhereInputArgument[] | undefined,
  agendaItem?: CommitteeagendaitemWhereInputArgument | null | undefined,
  agendaItemId?: IDWhereInputArgument | null | undefined,
  author?: UserWhereInputArgument | null | undefined,
  authorId?: IDWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  delegation?: DelegationWhereInputArgument | null | undefined,
  delegationId?: IDWhereInputArgument | null | undefined,
  firstSubmittedAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  status?: PaperstatusEnum | null | undefined,
  type?: PapertypeEnum | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  versions?: PaperversionWhereInputArgument | null | undefined    
};
		
export type Paperreview = {
  comments: JSON,
  createdAt: DateTime,
  id: ID,
  paperVersion: (p?: {
    orderBy?: PaperversionOrderInputArgument | null | undefined,
    where?: PaperversionWhereInputArgument | null | undefined
  }) => Paperversion,
  paperVersionId: ID,
  reviewer: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  reviewerId: ID,
  statusAfter: PaperstatusEnum | null,
  statusBefore: PaperstatusEnum | null    
};
		
export type PaperreviewOrderInputArgument = {
  comments?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  paperVersionId?: SortingParameter | null | undefined,
  reviewerId?: SortingParameter | null | undefined,
  statusAfter?: SortingParameter | null | undefined,
  statusBefore?: SortingParameter | null | undefined    
};
		
export type PaperreviewWhereInputArgument = {
  AND?: PaperreviewWhereInputArgument[] | undefined,
  NOT?: PaperreviewWhereInputArgument | null | undefined,
  OR?: PaperreviewWhereInputArgument[] | undefined,
  comments?: JSONWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  paperVersion?: PaperversionWhereInputArgument | null | undefined,
  paperVersionId?: IDWhereInputArgument | null | undefined,
  reviewer?: UserWhereInputArgument | null | undefined,
  reviewerId?: IDWhereInputArgument | null | undefined,
  statusAfter?: PaperstatusEnum | null | undefined,
  statusBefore?: PaperstatusEnum | null | undefined    
};
		
export type PaperstatusEnum = "ACCEPTED" | "CHANGES_REQUESTED" | "DRAFT" | "REVISED" | "SUBMITTED";
		
export type PapertypeEnum = "INTRODUCTION_PAPER" | "POSITION_PAPER" | "WORKING_PAPER";
		
export type Paperversion = {
  content: JSON,
  createdAt: DateTime,
  id: ID,
  paper: (p?: {
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper,
  paperId: ID,
  reviews: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperreviewOrderInputArgument | null | undefined,
    where?: PaperreviewWhereInputArgument | null | undefined
  }) => Paperreview[],
  status: PaperstatusEnum,
  version: Int    
};
		
export type PaperversionOrderInputArgument = {
  content?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  paperId?: SortingParameter | null | undefined,
  status?: SortingParameter | null | undefined,
  version?: SortingParameter | null | undefined    
};
		
export type PaperversionWhereInputArgument = {
  AND?: PaperversionWhereInputArgument[] | undefined,
  NOT?: PaperversionWhereInputArgument | null | undefined,
  OR?: PaperversionWhereInputArgument[] | undefined,
  content?: JSONWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  paper?: PaperWhereInputArgument | null | undefined,
  paperId?: IDWhereInputArgument | null | undefined,
  reviews?: PaperreviewWhereInputArgument | null | undefined,
  status?: PaperstatusEnum | null | undefined,
  version?: IntWhereInputArgument | null | undefined    
};
		
export type Paymenttransaction = {
  amount: Float,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  id: ID,
  paymentFor: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserreferenceinpaymenttransactionOrderInputArgument | null | undefined,
    where?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined
  }) => Userreferenceinpaymenttransaction[],
  recievedAt: DateTime | null,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type PaymenttransactionOrderInputArgument = {
  amount?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  recievedAt?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type PaymenttransactionWhereInputArgument = {
  AND?: PaymenttransactionWhereInputArgument[] | undefined,
  NOT?: PaymenttransactionWhereInputArgument | null | undefined,
  OR?: PaymenttransactionWhereInputArgument[] | undefined,
  amount?: FloatWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  paymentFor?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined,
  recievedAt?: DateTimeWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type PersonName = unknown;
		
export type PhoneNumber = unknown;
		
export type Place = {
  address: String | null,
  calendarEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendarentryOrderInputArgument | null | undefined,
    where?: CalendarentryWhereInputArgument | null | undefined
  }) => Calendarentry[],
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  directions: String | null,
  id: ID,
  info: String | null,
  latitude: Float | null,
  longitude: Float | null,
  name: String,
  sitePlanDataURL: String | null,
  updatedAt: DateTime,
  websiteUrl: String | null    
};
		
export type PlaceOrderInputArgument = {
  address?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  directions?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  info?: SortingParameter | null | undefined,
  latitude?: SortingParameter | null | undefined,
  longitude?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  sitePlanDataURL?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  websiteUrl?: SortingParameter | null | undefined    
};
		
export type PlaceWhereInputArgument = {
  AND?: PlaceWhereInputArgument[] | undefined,
  NOT?: PlaceWhereInputArgument | null | undefined,
  OR?: PlaceWhereInputArgument[] | undefined,
  address?: StringWhereInputArgument | null | undefined,
  calendarEntries?: CalendarentryWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  directions?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  info?: StringWhereInputArgument | null | undefined,
  latitude?: FloatWhereInputArgument | null | undefined,
  longitude?: FloatWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  sitePlanDataURL?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  websiteUrl?: StringWhereInputArgument | null | undefined    
};
		
export type PlausibilityResult = {
  dataMissing: () => User[],
  shouldBeSupervisor: () => User[],
  shouldNotBeSupervisor: () => User[],
  tooOldUsers: () => User[],
  tooYoungUsers: () => User[]    
};
		
export type PreviewConferenceSupervisor = {
  family_name: String | null,
  given_name: String | null    
};
		
export type Query = {
  attendanceEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: AttendanceentryOrderInputArgument | null | undefined,
    where?: AttendanceentryWhereInputArgument | null | undefined
  }) => Attendanceentry[],
  attendanceEntry: (p: {
    id: ID
  }) => Attendanceentry,
  calendarDay: (p: {
    id: ID
  }) => Calendarday,
  calendarDays: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendardayOrderInputArgument | null | undefined,
    where?: CalendardayWhereInputArgument | null | undefined
  }) => Calendarday[],
  calendarEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendarentryOrderInputArgument | null | undefined,
    where?: CalendarentryWhereInputArgument | null | undefined
  }) => Calendarentry[],
  calendarEntry: (p: {
    id: ID
  }) => Calendarentry,
  calendarTrack: (p: {
    id: ID
  }) => Calendartrack,
  calendarTracks: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendartrackOrderInputArgument | null | undefined,
    where?: CalendartrackWhereInputArgument | null | undefined
  }) => Calendartrack[],
  checkTeamInvitationEmails: (p: {
    conferenceId: ID,
    emails: CheckEmailInput[]
  }) => EmailStatusResult[],
  committee: (p: {
    id: ID
  }) => Committee,
  committeeAgendaItem: (p: {
    id: ID
  }) => Committeeagendaitem,
  committeeAgendaItems: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeagendaitemOrderInputArgument | null | undefined,
    where?: CommitteeagendaitemWhereInputArgument | null | undefined
  }) => Committeeagendaitem[],
  committees: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee[],
  conference: (p: {
    id: ID
  }) => Conference,
  conferenceParticipantStatus: (p: {
    id: ID
  }) => Conferenceparticipantstatus,
  conferenceParticipantStatuses: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceparticipantstatusOrderInputArgument | null | undefined,
    where?: ConferenceparticipantstatusWhereInputArgument | null | undefined
  }) => Conferenceparticipantstatus[],
  conferencePlausibility: (p: {
    conferenceId: ID
  }) => PlausibilityResult,
  conferenceSupervisor: (p: {
    id: ID
  }) => Conferencesupervisor,
  conferenceSupervisors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  conferences: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference[],
  customConferenceRole: (p: {
    id: ID
  }) => Customconferencerole,
  customConferenceRoles: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CustomconferenceroleOrderInputArgument | null | undefined,
    where?: CustomconferenceroleWhereInputArgument | null | undefined
  }) => Customconferencerole[],
  delegation: (p: {
    id: ID
  }) => Delegation,
  delegationMember: (p: {
    id: ID
  }) => Delegationmember,
  delegationMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  delegations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation[],
  findGlobalIntroductionPapers: (p: {
    conferenceId: ID
  }) => Paper[],
  findGlobalPapersGroupedByCommittee: (p: {
    conferenceId: ID
  }) => CommitteePaperGroup[],
  findIntroductionPapers: (p: {
    conferenceId: ID
  }) => Paper[],
  findNextPaperToReview: (p: {
    agendaItemId: ID
  }) => Paper,
  findPapersGroupedByCommittee: (p: {
    conferenceId: ID
  }) => CommitteePaperGroup[],
  findPublicPaperContent: (p: {
    paperId: ID
  }) => Paper,
  findSupervisedPapers: (p: {
    conferenceId: ID
  }) => Paper[],
  flagCollection: (p: {
    conferenceId: ID
  }) => FlagCollectionData,
  getAllConferenceNations: (p: {
    conferenceId: ID
  }) => Nation[],
  getCertificateJWT: (p: {
    conferenceId: ID,
    userId: ID
  }) => CertificateJWT,
  getCertificateJWTPublicKeyObject: () => JWK,
  getConferenceStatistics: (p: {
    conferenceId: ID,
    filter?: StatsFilter | null | undefined
  }) => StatisticsResult,
  impersonatableUsers: () => User[],
  impersonationStatus: () => ImpersonationStatus,
  logoutUrl: String,
  myOIDCRoles: OIDCRolesEnum[],
  myReviewStats: (p: {
    conferenceId: ID
  }) => MyReviewStats | null,
  myReviewerSnippets: () => Reviewersnippet[],
  nation: (p: {
    id: ID
  }) => Nation,
  nations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NationOrderInputArgument | null | undefined,
    where?: NationWhereInputArgument | null | undefined
  }) => Nation[],
  nonStateActor: (p: {
    id: ID
  }) => Nonstateactor,
  nonStateActors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NonstateactorOrderInputArgument | null | undefined,
    where?: NonstateactorWhereInputArgument | null | undefined
  }) => Nonstateactor[],
  offlineUserRefresh: () => OfflineUserRefresh,
  paper: (p: {
    id: ID
  }) => Paper,
  paperReview: (p: {
    id: ID
  }) => Paperreview,
  paperReviews: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperreviewOrderInputArgument | null | undefined,
    where?: PaperreviewWhereInputArgument | null | undefined
  }) => Paperreview[],
  paperVersion: (p: {
    id: ID
  }) => Paperversion,
  paperVersions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperversionOrderInputArgument | null | undefined,
    where?: PaperversionWhereInputArgument | null | undefined
  }) => Paperversion[],
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  paymentTransaction: (p: {
    id: ID
  }) => Paymenttransaction,
  paymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaymenttransactionOrderInputArgument | null | undefined,
    where?: PaymenttransactionWhereInputArgument | null | undefined
  }) => Paymenttransaction[],
  place: (p: {
    id: ID
  }) => Place,
  places: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PlaceOrderInputArgument | null | undefined,
    where?: PlaceWhereInputArgument | null | undefined
  }) => Place[],
  previewConferenceSupervisor: (p: {
    conferenceId: ID,
    connectionCode: String
  }) => PreviewConferenceSupervisor,
  previewDelegation: (p: {
    conferenceId: ID,
    entryCode: String
  }) => DelegationPreview,
  previewUserByIdOrEmail: (p: {
    emailOrId: String
  }) => UserPreview,
  reviewerLeaderboard: (p: {
    conferenceId: ID
  }) => ReviewerStat[],
  reviewerSnippet: (p: {
    id: ID
  }) => Reviewersnippet,
  reviewerSnippets: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ReviewersnippetOrderInputArgument | null | undefined,
    where?: ReviewersnippetWhereInputArgument | null | undefined
  }) => Reviewersnippet[],
  roleApplication: (p: {
    id: ID
  }) => Roleapplication,
  roleApplications: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: RoleapplicationOrderInputArgument | null | undefined,
    where?: RoleapplicationWhereInputArgument | null | undefined
  }) => Roleapplication[],
  searchConference: (p: {
    conferenceId: ID,
    searchTerm: String
  }) => SearchConferenceResult,
  singleParticipant: (p: {
    id: ID
  }) => Singleparticipant,
  singleParticipants: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  surveyAnswer: (p: {
    id: ID
  }) => Surveyanswer,
  surveyAnswers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyanswerOrderInputArgument | null | undefined,
    where?: SurveyanswerWhereInputArgument | null | undefined
  }) => Surveyanswer[],
  surveyOption: (p: {
    id: ID
  }) => Surveyoption,
  surveyOptions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyoptionOrderInputArgument | null | undefined,
    where?: SurveyoptionWhereInputArgument | null | undefined
  }) => Surveyoption[],
  surveyQuestion: (p: {
    id: ID
  }) => Surveyquestion,
  surveyQuestions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyquestionOrderInputArgument | null | undefined,
    where?: SurveyquestionWhereInputArgument | null | undefined
  }) => Surveyquestion[],
  teamMember: (p: {
    id: ID
  }) => Teammember,
  teamMemberInvitation: (p: {
    id: ID
  }) => Teammemberinvitation,
  teamMemberInvitations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberinvitationOrderInputArgument | null | undefined,
    where?: TeammemberinvitationWhereInputArgument | null | undefined
  }) => Teammemberinvitation[],
  teamMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberOrderInputArgument | null | undefined,
    where?: TeammemberWhereInputArgument | null | undefined
  }) => Teammember[],
  user: (p: {
    id: ID
  }) => User,
  userReferenceInPaymentTransaction: (p: {
    id: ID
  }) => Userreferenceinpaymenttransaction,
  userReferenceInPaymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserreferenceinpaymenttransactionOrderInputArgument | null | undefined,
    where?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined
  }) => Userreferenceinpaymenttransaction[],
  users: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User[],
  waitingListEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: WaitinglistentryOrderInputArgument | null | undefined,
    where?: WaitinglistentryWhereInputArgument | null | undefined
  }) => Waitinglistentry[],
  waitingListEntry: (p: {
    id: ID
  }) => Waitinglistentry    
};
		
export type RegenerateInvitationResult = {
  message: String | null,
  newExpiresAt: DateTime | null,
  newToken: String | null,
  success: Boolean    
};
		
export type ReviewerStat = {
  anonymizedName: String,
  firstReviews: Int,
  isCurrentUser: Boolean,
  totalReviews: Int    
};
		
export type Reviewersnippet = {
  content: JSON,
  createdAt: DateTime,
  id: ID,
  name: String,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type ReviewersnippetOrderInputArgument = {
  content?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  name?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type ReviewersnippetWhereInputArgument = {
  AND?: ReviewersnippetWhereInputArgument[] | undefined,
  NOT?: ReviewersnippetWhereInputArgument | null | undefined,
  OR?: ReviewersnippetWhereInputArgument[] | undefined,
  content?: JSONWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  name?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type ReviewhelpstatusEnum = "HELP_NEEDED" | "NO_HELP_WANTED" | "UNSPECIFIED";
		
export type RevokeInvitationResult = {
  message: String | null,
  success: Boolean    
};
		
export type Roleapplication = {
  createdAt: DateTime,
  delegation: (p?: {
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation,
  delegationId: ID,
  id: ID,
  nation: (p?: {
    orderBy?: NationOrderInputArgument | null | undefined,
    where?: NationWhereInputArgument | null | undefined
  }) => Nation | null,
  nationId: ID | null,
  nonStateActor: (p?: {
    orderBy?: NonstateactorOrderInputArgument | null | undefined,
    where?: NonstateactorWhereInputArgument | null | undefined
  }) => Nonstateactor | null,
  nonStateActorId: ID | null,
  rank: Int,
  updatedAt: DateTime    
};
		
export type RoleapplicationOrderInputArgument = {
  createdAt?: SortingParameter | null | undefined,
  delegationId?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  nationId?: SortingParameter | null | undefined,
  nonStateActorId?: SortingParameter | null | undefined,
  rank?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type RoleapplicationWhereInputArgument = {
  AND?: RoleapplicationWhereInputArgument[] | undefined,
  NOT?: RoleapplicationWhereInputArgument | null | undefined,
  OR?: RoleapplicationWhereInputArgument[] | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  delegation?: DelegationWhereInputArgument | null | undefined,
  delegationId?: IDWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  nation?: NationWhereInputArgument | null | undefined,
  nationId?: IDWhereInputArgument | null | undefined,
  nonStateActor?: NonstateactorWhereInputArgument | null | undefined,
  nonStateActorId?: IDWhereInputArgument | null | undefined,
  rank?: IntWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type SearchConferenceResult = {
  delegations: () => SearchDelegationResult[],
  foreignUsers: () => SearchForeignUserResult[],
  transactions: () => SearchTransactionResult[],
  users: () => SearchUserResult[]    
};
		
export type SearchDelegationResult = {
  assignedNationAlpha3Code: String | null,
  assignedNonStateActorName: String | null,
  entryCode: String,
  headDelegateUserId: String | null,
  id: String,
  memberCount: Int,
  school: String | null    
};
		
export type SearchForeignUserResult = {
  email: String,
  familyName: String,
  givenName: String,
  id: String    
};
		
export type SearchTransactionResult = {
  amount: Float,
  currency: String,
  id: String,
  recievedAt: String | null    
};
		
export type SearchUserResult = {
  email: String,
  familyName: String,
  givenName: String,
  id: String,
  participationType: String    
};
		
export type Singleparticipant = {
  applied: Boolean,
  appliedForRoles: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CustomconferenceroleOrderInputArgument | null | undefined,
    where?: CustomconferenceroleWhereInputArgument | null | undefined
  }) => Customconferencerole[],
  assignedRole: (p?: {
    orderBy?: CustomconferenceroleOrderInputArgument | null | undefined,
    where?: CustomconferenceroleWhereInputArgument | null | undefined
  }) => Customconferencerole | null,
  assignedRoleId: ID | null,
  assignmentDetails: String | null,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  experience: String | null,
  id: ID,
  motivation: String | null,
  school: String | null,
  supervisors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type SingleparticipantOrderInputArgument = {
  applied?: SortingParameter | null | undefined,
  assignedRoleId?: SortingParameter | null | undefined,
  assignmentDetails?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  experience?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  motivation?: SortingParameter | null | undefined,
  school?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type SingleparticipantWhereInputArgument = {
  AND?: SingleparticipantWhereInputArgument[] | undefined,
  NOT?: SingleparticipantWhereInputArgument | null | undefined,
  OR?: SingleparticipantWhereInputArgument[] | undefined,
  applied?: BooleanWhereInputArgument | null | undefined,
  appliedForRoles?: CustomconferenceroleWhereInputArgument | null | undefined,
  assignedRole?: CustomconferenceroleWhereInputArgument | null | undefined,
  assignedRoleId?: IDWhereInputArgument | null | undefined,
  assignmentDetails?: StringWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  experience?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  motivation?: StringWhereInputArgument | null | undefined,
  school?: StringWhereInputArgument | null | undefined,
  supervisors?: ConferencesupervisorWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type SortingParameter = "asc" | "desc";
		
export type StatisticsResult = {
  addresses: () => StatisticsResultAddresses[],
  age: () => StatisticsResultAge,
  committeeFillRates: () => StatisticsResultCommitteeFillRate[],
  countdowns: () => StatisticsResultCountdowns,
  diet: () => StatisticsResultRegisteredParticipantDiet,
  gender: () => StatisticsResultRegisteredParticipantGender,
  nationalityDistribution: () => StatisticsResultNationality[],
  paperStats: () => StatisticsResultPaperStats,
  postalPaymentProgress: () => StatisticsResultPostalPaymentProgress,
  registered: () => StatisticsResultRegistered,
  registrationTimeline: () => StatisticsResultRegistrationTimeline[],
  roleBased: () => StatisticsResultRoleBased,
  schoolStats: () => StatisticsResultSchool[],
  status: () => StatisticsResultRegisteredParticipantStatus,
  supervisorStats: () => StatisticsResultSupervisorStats,
  waitingList: () => StatisticsResultWaitingList    
};
		
export type StatisticsResultAddresses = {
  _count: () => StatisticsResultAddressesCount,
  country: String | null,
  zip: String | null    
};
		
export type StatisticsResultAddressesCount = {
  _all: Int,
  country: Int,
  zip: Int    
};
		
export type StatisticsResultAge = {
  byCategory: () => StatisticsResultAgeCategoryStats[],
  byCommittee: () => StatisticsResultAgeCommitteeStats[],
  distribution: () => StatisticsResultAgeDistributionEntry[],
  overall: () => StatisticsResultAgeOverall    
};
		
export type StatisticsResultAgeCategoryBreakdown = {
  categoryId: String,
  count: Int    
};
		
export type StatisticsResultAgeCategoryStats = {
  average: Float | null,
  categoryId: String,
  categoryName: String,
  categoryType: String,
  count: Int    
};
		
export type StatisticsResultAgeCommitteeStats = {
  abbreviation: String,
  average: Float | null,
  committeeId: String,
  committeeName: String,
  count: Int    
};
		
export type StatisticsResultAgeDistributionEntry = {
  age: Int,
  byCategory: () => StatisticsResultAgeCategoryBreakdown[],
  count: Int    
};
		
export type StatisticsResultAgeOverall = {
  average: Float | null,
  missingBirthdays: Int,
  total: Int    
};
		
export type StatisticsResultCommitteeFillRate = {
  abbreviation: String,
  assignedSeats: Int,
  committeeId: ID,
  fillPercentage: Int,
  name: String,
  totalSeats: Int    
};
		
export type StatisticsResultCountdowns = {
  daysUntilConference: Int,
  daysUntilEndRegistration: Int    
};
		
export type StatisticsResultNationality = {
  count: Int,
  country: String,
  countryCode: String    
};
		
export type StatisticsResultPaperStats = {
  byCommittee: () => StatisticsResultPapersByCommittee[],
  byStatus: () => StatisticsResultPapersByStatus,
  byType: () => StatisticsResultPapersByType,
  total: Int,
  withReviews: Int,
  withoutReviews: Int    
};
		
export type StatisticsResultPapersByCommittee = {
  abbreviation: String,
  committeeId: String,
  count: Int,
  name: String    
};
		
export type StatisticsResultPapersByStatus = {
  accepted: Int,
  changesRequested: Int,
  draft: Int,
  submitted: Int    
};
		
export type StatisticsResultPapersByType = {
  introductionPaper: Int,
  positionPaper: Int,
  workingPaper: Int    
};
		
export type StatisticsResultPostalPaymentProgress = {
  bothComplete: Int,
  maxParticipants: Int,
  neitherComplete: Int,
  paymentDone: Int,
  paymentOnlyComplete: Int,
  paymentPending: Int,
  paymentPercentage: Int,
  paymentProblem: Int,
  postalDone: Int,
  postalOnlyComplete: Int,
  postalPending: Int,
  postalPercentage: Int,
  postalProblem: Int    
};
		
export type StatisticsResultRegistered = {
  applied: Int,
  delegationMembers: () => StatisticsResultRegisteredDelegationMembers,
  delegations: () => StatisticsResultRegisteredDelegations,
  notApplied: Int,
  singleParticipants: () => StatisticsResultRegisteredSingleParticipants,
  supervisors: Int,
  total: Int    
};
		
export type StatisticsResultRegisteredDelegationMembers = {
  applied: Int,
  notApplied: Int,
  total: Int    
};
		
export type StatisticsResultRegisteredDelegations = {
  applied: Int,
  notApplied: Int,
  total: Int    
};
		
export type StatisticsResultRegisteredParticipantDiet = {
  delegationMembers: () => StatisticsResultRegisteredParticipantDietVariations,
  singleParticipants: () => StatisticsResultRegisteredParticipantDietVariations,
  supervisors: () => StatisticsResultRegisteredParticipantDietVariations,
  teamMembers: () => StatisticsResultRegisteredParticipantDietVariations    
};
		
export type StatisticsResultRegisteredParticipantDietVariations = {
  omnivore: Int,
  vegan: Int,
  vegetarian: Int    
};
		
export type StatisticsResultRegisteredParticipantGender = {
  delegationMembers: () => StatisticsResultRegisteredParticipantGenderVariations,
  singleParticipants: () => StatisticsResultRegisteredParticipantGenderVariations,
  supervisors: () => StatisticsResultRegisteredParticipantGenderVariations,
  teamMembers: () => StatisticsResultRegisteredParticipantGenderVariations    
};
		
export type StatisticsResultRegisteredParticipantGenderVariations = {
  diverse: Int,
  female: Int,
  male: Int,
  noStatement: Int    
};
		
export type StatisticsResultRegisteredParticipantStatus = {
  didAttend: Int,
  paymentStatus: () => StatisticsResultRegisteredParticipantStatusPayment,
  postalStatus: () => StatisticsResultRegisteredParticipantStatusPostalRegistration    
};
		
export type StatisticsResultRegisteredParticipantStatusPayment = {
  done: Int,
  problem: Int    
};
		
export type StatisticsResultRegisteredParticipantStatusPostalRegistration = {
  done: Int,
  problem: Int    
};
		
export type StatisticsResultRegisteredSingleParticipants = {
  applied: Int,
  byRole: () => StatisticsResultRegisteredSingleParticipantsByRole[],
  notApplied: Int,
  total: Int    
};
		
export type StatisticsResultRegisteredSingleParticipantsByRole = {
  applied: Int,
  fontAwesomeIcon: String | null,
  notApplied: Int,
  role: String,
  total: Int    
};
		
export type StatisticsResultRegistrationTimeline = {
  cumulativeDelegationMembers: Int,
  cumulativeDelegations: Int,
  cumulativeSingleParticipants: Int,
  cumulativeSupervisors: Int,
  date: String    
};
		
export type StatisticsResultRoleBased = {
  delegationMembersWithCommittee: Int,
  delegationMembersWithRole: Int,
  delegationMembersWithoutCommittee: Int,
  delegationMembersWithoutRole: Int,
  delegationsWithAssignment: Int,
  delegationsWithoutAssignment: Int,
  singleParticipantsWithRole: Int,
  singleParticipantsWithoutRole: Int    
};
		
export type StatisticsResultSchool = {
  delegationCount: Int,
  memberCount: Int,
  school: String    
};
		
export type StatisticsResultSupervisorStats = {
  accepted: Int,
  acceptedAndNotPresent: Int,
  acceptedAndPresent: Int,
  doesNotPlanAttendance: Int,
  plansAttendance: Int,
  rejected: Int,
  rejectedAndNotPresent: Int,
  rejectedAndPresent: Int,
  total: Int    
};
		
export type StatisticsResultWaitingList = {
  assigned: Int,
  hidden: Int,
  total: Int,
  unassigned: Int,
  visible: Int    
};
		
export type StatsFilter = "ALL" | "APPLIED" | "APPLIED_WITHOUT_ROLE" | "APPLIED_WITH_ROLE" | "NOT_APPLIED";
		
export type String = string;
		
export type StringWhereInputArgument = {
  AND?: StringWhereInputArgument[] | undefined,
  NOT?: StringWhereInputArgument | null | undefined,
  OR?: StringWhereInputArgument[] | undefined,
  arrayContained?: String[] | undefined,
  arrayContains?: String[] | undefined,
  arrayOverlaps?: String[] | undefined,
  eq?: String | null | undefined,
  gt?: String | null | undefined,
  gte?: String | null | undefined,
  ilike?: String | null | undefined,
  in?: String[] | undefined,
  isNotNull?: Boolean | null | undefined,
  isNull?: Boolean | null | undefined,
  like?: String | null | undefined,
  lt?: String | null | undefined,
  lte?: String | null | undefined,
  ne?: String | null | undefined,
  notIlike?: String | null | undefined,
  notIn?: String[] | undefined,
  notLike?: String | null | undefined    
};
		
export type Subscription = {
  attendanceEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: AttendanceentryOrderInputArgument | null | undefined,
    where?: AttendanceentryWhereInputArgument | null | undefined
  }) => Attendanceentry[],
  attendanceEntry: (p: {
    id: ID
  }) => Attendanceentry,
  calendarDay: (p: {
    id: ID
  }) => Calendarday,
  calendarDays: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendardayOrderInputArgument | null | undefined,
    where?: CalendardayWhereInputArgument | null | undefined
  }) => Calendarday[],
  calendarEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendarentryOrderInputArgument | null | undefined,
    where?: CalendarentryWhereInputArgument | null | undefined
  }) => Calendarentry[],
  calendarEntry: (p: {
    id: ID
  }) => Calendarentry,
  calendarTrack: (p: {
    id: ID
  }) => Calendartrack,
  calendarTracks: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CalendartrackOrderInputArgument | null | undefined,
    where?: CalendartrackWhereInputArgument | null | undefined
  }) => Calendartrack[],
  committee: (p: {
    id: ID
  }) => Committee,
  committeeAgendaItem: (p: {
    id: ID
  }) => Committeeagendaitem,
  committeeAgendaItems: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeagendaitemOrderInputArgument | null | undefined,
    where?: CommitteeagendaitemWhereInputArgument | null | undefined
  }) => Committeeagendaitem[],
  committees: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CommitteeOrderInputArgument | null | undefined,
    where?: CommitteeWhereInputArgument | null | undefined
  }) => Committee[],
  conference: (p: {
    id: ID
  }) => Conference,
  conferenceParticipantStatus: (p: {
    id: ID
  }) => Conferenceparticipantstatus,
  conferenceParticipantStatuses: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceparticipantstatusOrderInputArgument | null | undefined,
    where?: ConferenceparticipantstatusWhereInputArgument | null | undefined
  }) => Conferenceparticipantstatus[],
  conferenceSupervisor: (p: {
    id: ID
  }) => Conferencesupervisor,
  conferenceSupervisors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  conferences: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference[],
  customConferenceRole: (p: {
    id: ID
  }) => Customconferencerole,
  customConferenceRoles: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: CustomconferenceroleOrderInputArgument | null | undefined,
    where?: CustomconferenceroleWhereInputArgument | null | undefined
  }) => Customconferencerole[],
  delegation: (p: {
    id: ID
  }) => Delegation,
  delegationMember: (p: {
    id: ID
  }) => Delegationmember,
  delegationMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  delegations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationOrderInputArgument | null | undefined,
    where?: DelegationWhereInputArgument | null | undefined
  }) => Delegation[],
  nation: (p: {
    id: ID
  }) => Nation,
  nations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NationOrderInputArgument | null | undefined,
    where?: NationWhereInputArgument | null | undefined
  }) => Nation[],
  nonStateActor: (p: {
    id: ID
  }) => Nonstateactor,
  nonStateActors: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: NonstateactorOrderInputArgument | null | undefined,
    where?: NonstateactorWhereInputArgument | null | undefined
  }) => Nonstateactor[],
  paper: (p: {
    id: ID
  }) => Paper,
  paperReview: (p: {
    id: ID
  }) => Paperreview,
  paperReviews: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperreviewOrderInputArgument | null | undefined,
    where?: PaperreviewWhereInputArgument | null | undefined
  }) => Paperreview[],
  paperVersion: (p: {
    id: ID
  }) => Paperversion,
  paperVersions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperversionOrderInputArgument | null | undefined,
    where?: PaperversionWhereInputArgument | null | undefined
  }) => Paperversion[],
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  paymentTransaction: (p: {
    id: ID
  }) => Paymenttransaction,
  paymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaymenttransactionOrderInputArgument | null | undefined,
    where?: PaymenttransactionWhereInputArgument | null | undefined
  }) => Paymenttransaction[],
  place: (p: {
    id: ID
  }) => Place,
  places: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PlaceOrderInputArgument | null | undefined,
    where?: PlaceWhereInputArgument | null | undefined
  }) => Place[],
  reviewerSnippet: (p: {
    id: ID
  }) => Reviewersnippet,
  reviewerSnippets: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ReviewersnippetOrderInputArgument | null | undefined,
    where?: ReviewersnippetWhereInputArgument | null | undefined
  }) => Reviewersnippet[],
  roleApplication: (p: {
    id: ID
  }) => Roleapplication,
  roleApplications: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: RoleapplicationOrderInputArgument | null | undefined,
    where?: RoleapplicationWhereInputArgument | null | undefined
  }) => Roleapplication[],
  singleParticipant: (p: {
    id: ID
  }) => Singleparticipant,
  singleParticipants: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  surveyAnswer: (p: {
    id: ID
  }) => Surveyanswer,
  surveyAnswers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyanswerOrderInputArgument | null | undefined,
    where?: SurveyanswerWhereInputArgument | null | undefined
  }) => Surveyanswer[],
  surveyOption: (p: {
    id: ID
  }) => Surveyoption,
  surveyOptions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyoptionOrderInputArgument | null | undefined,
    where?: SurveyoptionWhereInputArgument | null | undefined
  }) => Surveyoption[],
  surveyQuestion: (p: {
    id: ID
  }) => Surveyquestion,
  surveyQuestions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyquestionOrderInputArgument | null | undefined,
    where?: SurveyquestionWhereInputArgument | null | undefined
  }) => Surveyquestion[],
  teamMember: (p: {
    id: ID
  }) => Teammember,
  teamMemberInvitation: (p: {
    id: ID
  }) => Teammemberinvitation,
  teamMemberInvitations: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberinvitationOrderInputArgument | null | undefined,
    where?: TeammemberinvitationWhereInputArgument | null | undefined
  }) => Teammemberinvitation[],
  teamMembers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberOrderInputArgument | null | undefined,
    where?: TeammemberWhereInputArgument | null | undefined
  }) => Teammember[],
  user: (p: {
    id: ID
  }) => User,
  userReferenceInPaymentTransaction: (p: {
    id: ID
  }) => Userreferenceinpaymenttransaction,
  userReferenceInPaymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserreferenceinpaymenttransactionOrderInputArgument | null | undefined,
    where?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined
  }) => Userreferenceinpaymenttransaction[],
  users: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User[],
  waitingListEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: WaitinglistentryOrderInputArgument | null | undefined,
    where?: WaitinglistentryWhereInputArgument | null | undefined
  }) => Waitinglistentry[],
  waitingListEntry: (p: {
    id: ID
  }) => Waitinglistentry    
};
		
export type Surveyanswer = {
  createdAt: DateTime,
  id: ID,
  option: (p?: {
    orderBy?: SurveyoptionOrderInputArgument | null | undefined,
    where?: SurveyoptionWhereInputArgument | null | undefined
  }) => Surveyoption,
  optionId: ID,
  question: (p?: {
    orderBy?: SurveyquestionOrderInputArgument | null | undefined,
    where?: SurveyquestionWhereInputArgument | null | undefined
  }) => Surveyquestion,
  questionId: ID,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type SurveyanswerOrderInputArgument = {
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  optionId?: SortingParameter | null | undefined,
  questionId?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type SurveyanswerWhereInputArgument = {
  AND?: SurveyanswerWhereInputArgument[] | undefined,
  NOT?: SurveyanswerWhereInputArgument | null | undefined,
  OR?: SurveyanswerWhereInputArgument[] | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  option?: SurveyoptionWhereInputArgument | null | undefined,
  optionId?: IDWhereInputArgument | null | undefined,
  question?: SurveyquestionWhereInputArgument | null | undefined,
  questionId?: IDWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type Surveyoption = {
  createdAt: DateTime,
  description: String,
  id: ID,
  question: (p?: {
    orderBy?: SurveyquestionOrderInputArgument | null | undefined,
    where?: SurveyquestionWhereInputArgument | null | undefined
  }) => Surveyquestion,
  questionId: ID,
  surveyAnswers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyanswerOrderInputArgument | null | undefined,
    where?: SurveyanswerWhereInputArgument | null | undefined
  }) => Surveyanswer[],
  title: String,
  updatedAt: DateTime,
  upperLimit: Int    
};
		
export type SurveyoptionOrderInputArgument = {
  createdAt?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  questionId?: SortingParameter | null | undefined,
  title?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  upperLimit?: SortingParameter | null | undefined    
};
		
export type SurveyoptionWhereInputArgument = {
  AND?: SurveyoptionWhereInputArgument[] | undefined,
  NOT?: SurveyoptionWhereInputArgument | null | undefined,
  OR?: SurveyoptionWhereInputArgument[] | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  question?: SurveyquestionWhereInputArgument | null | undefined,
  questionId?: IDWhereInputArgument | null | undefined,
  surveyAnswers?: SurveyanswerWhereInputArgument | null | undefined,
  title?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  upperLimit?: IntWhereInputArgument | null | undefined    
};
		
export type Surveyquestion = {
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  deadline: DateTime,
  description: String,
  draft: Boolean,
  hidden: Boolean,
  id: ID,
  options: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyoptionOrderInputArgument | null | undefined,
    where?: SurveyoptionWhereInputArgument | null | undefined
  }) => Surveyoption[],
  showSelectionOnDashboard: Boolean,
  surveyAnswers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyanswerOrderInputArgument | null | undefined,
    where?: SurveyanswerWhereInputArgument | null | undefined
  }) => Surveyanswer[],
  title: String,
  updatedAt: DateTime    
};
		
export type SurveyquestionOrderInputArgument = {
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  deadline?: SortingParameter | null | undefined,
  description?: SortingParameter | null | undefined,
  draft?: SortingParameter | null | undefined,
  hidden?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  showSelectionOnDashboard?: SortingParameter | null | undefined,
  title?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined    
};
		
export type SurveyquestionWhereInputArgument = {
  AND?: SurveyquestionWhereInputArgument[] | undefined,
  NOT?: SurveyquestionWhereInputArgument | null | undefined,
  OR?: SurveyquestionWhereInputArgument[] | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  deadline?: DateTimeWhereInputArgument | null | undefined,
  description?: StringWhereInputArgument | null | undefined,
  draft?: BooleanWhereInputArgument | null | undefined,
  hidden?: BooleanWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  options?: SurveyoptionWhereInputArgument | null | undefined,
  showSelectionOnDashboard?: BooleanWhereInputArgument | null | undefined,
  surveyAnswers?: SurveyanswerWhereInputArgument | null | undefined,
  title?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type Teammember = {
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  id: ID,
  role: TeamroleEnum,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type TeammemberOrderInputArgument = {
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  role?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type TeammemberWhereInputArgument = {
  AND?: TeammemberWhereInputArgument[] | undefined,
  NOT?: TeammemberWhereInputArgument | null | undefined,
  OR?: TeammemberWhereInputArgument[] | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  role?: TeamroleEnum | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type Teammemberinvitation = {
  acceptedBy: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User | null,
  acceptedById: ID | null,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  email: String,
  expiresAt: DateTime,
  id: ID,
  invitedBy: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  invitedById: ID,
  revokedAt: DateTime | null,
  role: TeamroleEnum,
  token: String,
  updatedAt: DateTime,
  usedAt: DateTime | null    
};
		
export type TeammemberinvitationOrderInputArgument = {
  acceptedById?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  email?: SortingParameter | null | undefined,
  expiresAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  invitedById?: SortingParameter | null | undefined,
  revokedAt?: SortingParameter | null | undefined,
  role?: SortingParameter | null | undefined,
  token?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  usedAt?: SortingParameter | null | undefined    
};
		
export type TeammemberinvitationWhereInputArgument = {
  AND?: TeammemberinvitationWhereInputArgument[] | undefined,
  NOT?: TeammemberinvitationWhereInputArgument | null | undefined,
  OR?: TeammemberinvitationWhereInputArgument[] | undefined,
  acceptedBy?: UserWhereInputArgument | null | undefined,
  acceptedById?: IDWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  email?: StringWhereInputArgument | null | undefined,
  expiresAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  invitedBy?: UserWhereInputArgument | null | undefined,
  invitedById?: IDWhereInputArgument | null | undefined,
  revokedAt?: DateTimeWhereInputArgument | null | undefined,
  role?: TeamroleEnum | null | undefined,
  token?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  usedAt?: DateTimeWhereInputArgument | null | undefined    
};
		
export type TeamroleEnum = "MEMBER" | "PARTICIPANT_CARE" | "PROJECT_MANAGEMENT" | "REVIEWER" | "TEAM_COORDINATOR";
		
export type UnlockedPieceData = {
  flagAlpha2Code: String | null,
  flagAlpha3Code: String | null,
  flagId: String,
  flagName: String,
  flagType: String,
  fontAwesomeIcon: String | null,
  foundCount: Int,
  isComplete: Boolean,
  pieceName: String,
  totalCount: Int    
};
		
export type User = {
  apartment: String | null,
  birthday: DateTime | null,
  city: String | null,
  conferenceParticipantStatus: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferenceparticipantstatusOrderInputArgument | null | undefined,
    where?: ConferenceparticipantstatusWhereInputArgument | null | undefined
  }) => Conferenceparticipantstatus[],
  conferenceSupervisor: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ConferencesupervisorOrderInputArgument | null | undefined,
    where?: ConferencesupervisorWhereInputArgument | null | undefined
  }) => Conferencesupervisor[],
  country: String | null,
  createdAt: DateTime,
  delegationMemberships: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: DelegationmemberOrderInputArgument | null | undefined,
    where?: DelegationmemberWhereInputArgument | null | undefined
  }) => Delegationmember[],
  email: String,
  emergencyContacts: String | null,
  familyName: String,
  foodPreference: FoodpreferenceEnum | null,
  gender: GenderEnum | null,
  givenName: String,
  globalNotes: String | null,
  id: ID,
  invitationsAccepted: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberinvitationOrderInputArgument | null | undefined,
    where?: TeammemberinvitationWhereInputArgument | null | undefined
  }) => Teammemberinvitation[],
  invitationsSent: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberinvitationOrderInputArgument | null | undefined,
    where?: TeammemberinvitationWhereInputArgument | null | undefined
  }) => Teammemberinvitation[],
  locale: String,
  ownPaymentTransactions: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaymenttransactionOrderInputArgument | null | undefined,
    where?: PaymenttransactionWhereInputArgument | null | undefined
  }) => Paymenttransaction[],
  paperReviews: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperreviewOrderInputArgument | null | undefined,
    where?: PaperreviewWhereInputArgument | null | undefined
  }) => Paperreview[],
  papers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: PaperOrderInputArgument | null | undefined,
    where?: PaperWhereInputArgument | null | undefined
  }) => Paper[],
  paymentTransactionsReferences: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: UserreferenceinpaymenttransactionOrderInputArgument | null | undefined,
    where?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined
  }) => Userreferenceinpaymenttransaction[],
  phone: String | null,
  preferredUsername: String,
  pronouns: String | null,
  recordedAttendanceEntries: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: AttendanceentryOrderInputArgument | null | undefined,
    where?: AttendanceentryWhereInputArgument | null | undefined
  }) => Attendanceentry[],
  reviewerSnippets: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: ReviewersnippetOrderInputArgument | null | undefined,
    where?: ReviewersnippetWhereInputArgument | null | undefined
  }) => Reviewersnippet[],
  singleParticipant: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SingleparticipantOrderInputArgument | null | undefined,
    where?: SingleparticipantWhereInputArgument | null | undefined
  }) => Singleparticipant[],
  street: String | null,
  surveyAnswers: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: SurveyanswerOrderInputArgument | null | undefined,
    where?: SurveyanswerWhereInputArgument | null | undefined
  }) => Surveyanswer[],
  teamMember: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: TeammemberOrderInputArgument | null | undefined,
    where?: TeammemberWhereInputArgument | null | undefined
  }) => Teammember[],
  updatedAt: DateTime,
  waitingListEntry: (p?: {
    limit?: Int | null | undefined,
    offset?: Int | null | undefined,
    orderBy?: WaitinglistentryOrderInputArgument | null | undefined,
    where?: WaitinglistentryWhereInputArgument | null | undefined
  }) => Waitinglistentry[],
  wantsJoinTeamInformation: Boolean,
  wantsToReceiveGeneralInformation: Boolean,
  zip: String | null    
};
		
export type UserOrderInputArgument = {
  apartment?: SortingParameter | null | undefined,
  birthday?: SortingParameter | null | undefined,
  city?: SortingParameter | null | undefined,
  country?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  email?: SortingParameter | null | undefined,
  emergencyContacts?: SortingParameter | null | undefined,
  familyName?: SortingParameter | null | undefined,
  foodPreference?: SortingParameter | null | undefined,
  gender?: SortingParameter | null | undefined,
  givenName?: SortingParameter | null | undefined,
  globalNotes?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  locale?: SortingParameter | null | undefined,
  phone?: SortingParameter | null | undefined,
  preferredUsername?: SortingParameter | null | undefined,
  pronouns?: SortingParameter | null | undefined,
  street?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  wantsJoinTeamInformation?: SortingParameter | null | undefined,
  wantsToReceiveGeneralInformation?: SortingParameter | null | undefined,
  zip?: SortingParameter | null | undefined    
};
		
export type UserPreview = {
  email: String,
  family_name: String | null,
  given_name: String | null,
  id: ID    
};
		
export type UserWhereInputArgument = {
  AND?: UserWhereInputArgument[] | undefined,
  NOT?: UserWhereInputArgument | null | undefined,
  OR?: UserWhereInputArgument[] | undefined,
  apartment?: StringWhereInputArgument | null | undefined,
  birthday?: DateTimeWhereInputArgument | null | undefined,
  city?: StringWhereInputArgument | null | undefined,
  conferenceParticipantStatus?: ConferenceparticipantstatusWhereInputArgument | null | undefined,
  conferenceSupervisor?: ConferencesupervisorWhereInputArgument | null | undefined,
  country?: StringWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  delegationMemberships?: DelegationmemberWhereInputArgument | null | undefined,
  email?: StringWhereInputArgument | null | undefined,
  emergencyContacts?: StringWhereInputArgument | null | undefined,
  familyName?: StringWhereInputArgument | null | undefined,
  foodPreference?: FoodpreferenceEnum | null | undefined,
  gender?: GenderEnum | null | undefined,
  givenName?: StringWhereInputArgument | null | undefined,
  globalNotes?: StringWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  invitationsAccepted?: TeammemberinvitationWhereInputArgument | null | undefined,
  invitationsSent?: TeammemberinvitationWhereInputArgument | null | undefined,
  locale?: StringWhereInputArgument | null | undefined,
  ownPaymentTransactions?: PaymenttransactionWhereInputArgument | null | undefined,
  paperReviews?: PaperreviewWhereInputArgument | null | undefined,
  papers?: PaperWhereInputArgument | null | undefined,
  paymentTransactionsReferences?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined,
  phone?: StringWhereInputArgument | null | undefined,
  preferredUsername?: StringWhereInputArgument | null | undefined,
  pronouns?: StringWhereInputArgument | null | undefined,
  recordedAttendanceEntries?: AttendanceentryWhereInputArgument | null | undefined,
  reviewerSnippets?: ReviewersnippetWhereInputArgument | null | undefined,
  singleParticipant?: SingleparticipantWhereInputArgument | null | undefined,
  street?: StringWhereInputArgument | null | undefined,
  surveyAnswers?: SurveyanswerWhereInputArgument | null | undefined,
  teamMember?: TeammemberWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  waitingListEntry?: WaitinglistentryWhereInputArgument | null | undefined,
  wantsJoinTeamInformation?: BooleanWhereInputArgument | null | undefined,
  wantsToReceiveGeneralInformation?: BooleanWhereInputArgument | null | undefined,
  zip?: StringWhereInputArgument | null | undefined    
};
		
export type Userreferenceinpaymenttransaction = {
  createdAt: DateTime,
  id: ID,
  paymentTransaction: (p?: {
    orderBy?: PaymenttransactionOrderInputArgument | null | undefined,
    where?: PaymenttransactionWhereInputArgument | null | undefined
  }) => Paymenttransaction,
  paymentTransactionId: ID,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type UserreferenceinpaymenttransactionOrderInputArgument = {
  createdAt?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  paymentTransactionId?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type UserreferenceinpaymenttransactionWhereInputArgument = {
  AND?: UserreferenceinpaymenttransactionWhereInputArgument[] | undefined,
  NOT?: UserreferenceinpaymenttransactionWhereInputArgument | null | undefined,
  OR?: UserreferenceinpaymenttransactionWhereInputArgument[] | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  paymentTransaction?: PaymenttransactionWhereInputArgument | null | undefined,
  paymentTransactionId?: IDWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export type Waitinglistentry = {
  assigned: Boolean,
  conference: (p?: {
    orderBy?: ConferenceOrderInputArgument | null | undefined,
    where?: ConferenceWhereInputArgument | null | undefined
  }) => Conference,
  conferenceId: ID,
  createdAt: DateTime,
  experience: String,
  hidden: Boolean,
  id: ID,
  motivation: String,
  requests: String | null,
  school: String,
  updatedAt: DateTime,
  user: (p?: {
    orderBy?: UserOrderInputArgument | null | undefined,
    where?: UserWhereInputArgument | null | undefined
  }) => User,
  userId: ID    
};
		
export type WaitinglistentryOrderInputArgument = {
  assigned?: SortingParameter | null | undefined,
  conferenceId?: SortingParameter | null | undefined,
  createdAt?: SortingParameter | null | undefined,
  experience?: SortingParameter | null | undefined,
  hidden?: SortingParameter | null | undefined,
  id?: SortingParameter | null | undefined,
  motivation?: SortingParameter | null | undefined,
  requests?: SortingParameter | null | undefined,
  school?: SortingParameter | null | undefined,
  updatedAt?: SortingParameter | null | undefined,
  userId?: SortingParameter | null | undefined    
};
		
export type WaitinglistentryWhereInputArgument = {
  AND?: WaitinglistentryWhereInputArgument[] | undefined,
  NOT?: WaitinglistentryWhereInputArgument | null | undefined,
  OR?: WaitinglistentryWhereInputArgument[] | undefined,
  assigned?: BooleanWhereInputArgument | null | undefined,
  conference?: ConferenceWhereInputArgument | null | undefined,
  conferenceId?: IDWhereInputArgument | null | undefined,
  createdAt?: DateTimeWhereInputArgument | null | undefined,
  experience?: StringWhereInputArgument | null | undefined,
  hidden?: BooleanWhereInputArgument | null | undefined,
  id?: IDWhereInputArgument | null | undefined,
  motivation?: StringWhereInputArgument | null | undefined,
  requests?: StringWhereInputArgument | null | undefined,
  school?: StringWhereInputArgument | null | undefined,
  updatedAt?: DateTimeWhereInputArgument | null | undefined,
  user?: UserWhereInputArgument | null | undefined,
  userId?: IDWhereInputArgument | null | undefined    
};
		
export const defaultOptions: ConstructorParameters<Client>[0] = {
  url: "/api/graphql2",
  fetchSubscriptions: true,
  exchanges: [cacheExchange({ schema }), nativeDateExchange, fetchExchange],
  fetchOptions: {
    credentials: "include",
  },
  requestPolicy: "cache-and-network",
}

export const client = {
  /**
   * A query and subscription combination. First queries and if exists, also subscribes to a subscription of the same name.
   * Combines the results of both, so the result is first the query result and then live updates from the subscription.
   * Assumes that the query and subscription return the same fields as per default when using the rumble query helpers.
   * If no subscription with the same name exists, this will just be a query.
   *
   * Internally, this does some magic to make the data reactive with Svelte's reactivity system. But it can be used with other frameworks as well.
   */
  liveQuery: makeLiveQuery<Query>({
	  urqlClient,
	  availableSubscriptions: new Set(["attendanceEntries", "attendanceEntry", "calendarDay", "calendarDays", "calendarEntries", "calendarEntry", "calendarTrack", "calendarTracks", "committee", "committeeAgendaItem", "committeeAgendaItems", "committees", "conference", "conferenceParticipantStatus", "conferenceParticipantStatuses", "conferenceSupervisor", "conferenceSupervisors", "conferences", "customConferenceRole", "customConferenceRoles", "delegation", "delegationMember", "delegationMembers", "delegations", "nation", "nations", "nonStateActor", "nonStateActors", "paper", "paperReview", "paperReviews", "paperVersion", "paperVersions", "papers", "paymentTransaction", "paymentTransactions", "place", "places", "reviewerSnippet", "reviewerSnippets", "roleApplication", "roleApplications", "singleParticipant", "singleParticipants", "surveyAnswer", "surveyAnswers", "surveyOption", "surveyOptions", "surveyQuestion", "surveyQuestions", "teamMember", "teamMemberInvitation", "teamMemberInvitations", "teamMembers", "user", "userReferenceInPaymentTransaction", "userReferenceInPaymentTransactions", "users", "waitingListEntries", "waitingListEntry"]),
		schema,
  }),
  /**
   * A mutation that can be used to e.g. create, update or delete data.
   */
  mutate: makeMutation<Mutation>({
	  urqlClient,
		schema,
  }),
  /**
   * A continuous stream of results that updates when the server sends new data.
   */
  subscribe: makeSubscription<Subscription>({
	  urqlClient,
		schema,
  }),
  /**
   * A one-time fetch of data.
   */
  query: makeQuery<Query>({
	  urqlClient,
		schema,
  }),
}