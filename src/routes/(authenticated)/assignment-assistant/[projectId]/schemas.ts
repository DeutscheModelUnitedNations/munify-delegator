import { z } from 'zod';

export const NationSchema = z.object({
	alpha2Code: z.string(),
	alpha3Code: z.string()
});

export const CommitteeSchema = z.object({
	id: z.string(),
	name: z.string(),
	abbreviation: z.string(),
	numOfSeatsPerDelegation: z.number(),
	nations: z.array(NationSchema)
});

export const IndividualApplicationOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	fontAwesomeIcon: z.string().nullable()
});

export const NonStateActorSchema = z.object({
	id: z.string(),
	name: z.string(),
	abbreviation: z.string(),
	fontAwesomeIcon: z.string().nullable(),
	seatAmount: z.number()
});

export const AppliedForDelegationRoleSchema = z.object({
	id: z.string(),
	rank: z.number(),
	nation: NationSchema.nullish(),
	nonStateActor: NonStateActorSchema.nullish(),
	fontAwesomeIcon: z.undefined(),
	name: z.undefined()
});

export const UserSchema = z.object({
	id: z.string()
});

export const SupervisorSchema = z.object({
	id: z.string(),
	user: UserSchema
});

export const MemberSchema = z.object({
	id: z.string(),
	isHeadDelegate: z.boolean(),
	user: UserSchema,
	supervisors: z.optional(z.array(SupervisorSchema))
});

export const AppliedForSingleRoleSchema = z.object({
	id: z.string(),
	fontAwesomeIcon: z.string().nullable(),
	name: z.string(),
	rank: z.undefined(),
	nation: z.undefined(),
	nonStateActor: z.undefined()
});

export const SightingPropsSchema = z.object({
	evaluation: z.number().nullish(),
	flagged: z.boolean().nullish(),
	disqualified: z.boolean().nullish(),
	note: z.string().nullish()
});

export const DelegationAssignmentSchema = z.object({
	assignedNation: NationSchema.nullish()
});

export const NSAAssignmentSchema = z.object({
	assignedNSA: NonStateActorSchema.nullish()
});

export const SingleAssignmentSchema = z.object({
	assignedRole: IndividualApplicationOptionSchema.nullish()
});

export const ConferenceSchema = z.object({
	id: z.string(),
	title: z.string(),
	startConference: z.coerce.date(),
	committees: z.array(CommitteeSchema),
	nonStateActors: z.array(NonStateActorSchema),
	individualApplicationOptions: z.array(IndividualApplicationOptionSchema)
});

export const DelegationSchema = z.object({
	id: z.string(),
	appliedForRoles: z.array(AppliedForDelegationRoleSchema),
	members: z.array(MemberSchema),
	school: z.string().optional(),
	supervisors: z.undefined(),
	user: z.undefined(),
	splittedFrom: z.string().nullish(),
	splittedInto: z.array(z.string()).nullish(),
	...SightingPropsSchema.shape,
	...DelegationAssignmentSchema.shape,
	...NSAAssignmentSchema.shape
});

export const SingleParticipantSchema = z.object({
	id: z.string(),
	user: UserSchema,
	appliedForRoles: z.array(AppliedForSingleRoleSchema),
	school: z.string().optional(),
	supervisors: z.optional(z.array(SupervisorSchema)),
	members: z.undefined(),
	splittedFrom: z.undefined(),
	splittedInto: z.undefined(),
	...SightingPropsSchema.shape,
	...SingleAssignmentSchema.shape
});

export const ProjectDataSchema = z.object({
	conference: ConferenceSchema,
	delegations: z.array(DelegationSchema),
	singleParticipants: z.array(SingleParticipantSchema)
});

export const ProjectSchema = z.object({
	id: z.string(),
	created: z.string(),
	fileName: z.string(),
	data: ProjectDataSchema
});

export type Nation = z.infer<typeof NationSchema>;
export type Committee = z.infer<typeof CommitteeSchema>;
export type IndividualApplicationOption = z.infer<typeof IndividualApplicationOptionSchema>;
export type NonStateActor = z.infer<typeof NonStateActorSchema>;
export type AppliedForDelegationRole = z.infer<typeof AppliedForDelegationRoleSchema>;
export type Delegation = z.infer<typeof DelegationSchema>;
export type AppliedForSingleRole = z.infer<typeof AppliedForSingleRoleSchema>;
export type SingleParticipant = z.infer<typeof SingleParticipantSchema>;
export type User = z.infer<typeof UserSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Supervisor = z.infer<typeof SupervisorSchema>;
export type SightingProps = z.infer<typeof SightingPropsSchema>;
export type DelegationAssignment = z.infer<typeof DelegationAssignmentSchema>;
export type NSAAssignment = z.infer<typeof NSAAssignmentSchema>;
export type SingleAssignment = z.infer<typeof SingleAssignmentSchema>;
export type Conference = z.infer<typeof ConferenceSchema>;
export type ProjectData = z.infer<typeof ProjectDataSchema>;
export type Project = z.infer<typeof ProjectSchema>;
