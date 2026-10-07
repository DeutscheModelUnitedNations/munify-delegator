import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { RAW_DATA_KEY } from '../local_storage_keys';
import { z } from 'zod';
import { nationSeats } from '$lib/helpers/nationSeats';
import { remainingSeats, summarizeSchools } from './projectStats';

const NationSchema = z.object({
	alpha2Code: z.string(),
	alpha3Code: z.string()
});

const CommitteeSchema = z.object({
	id: z.string(),
	name: z.string(),
	abbreviation: z.string(),
	numOfSeatsPerDelegation: z.number(),
	nations: z.array(NationSchema)
});

const IndividualApplicationOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	fontAwesomeIcon: z.string().nullable()
});

const NonStateActorSchema = z.object({
	id: z.string(),
	name: z.string(),
	abbreviation: z.string(),
	fontAwesomeIcon: z.string().nullable(),
	seatAmount: z.number()
});

const AppliedForDelegationRoleSchema = z.object({
	id: z.string(),
	rank: z.number(),
	nation: NationSchema.nullish(),
	nonStateActor: NonStateActorSchema.nullish(),
	// `.optional()` on top of `z.undefined()`: this only discriminates the role-application union
	// from AppliedForSingleRoleSchema below, and a `JSON` GraphQL scalar round-trips through real
	// JSON, which drops `undefined`-valued keys entirely (`JSON.stringify({ a: undefined })` is
	// `"{}"`) - so the key is always *absent* on arrival, never present-with-undefined. Zod 4's
	// `z.undefined()` alone requires the key to exist (unlike zod 3, which this schema was written
	// against), so it rejects every real payload without `.optional()`.
	fontAwesomeIcon: z.undefined().optional(),
	name: z.undefined().optional()
});

const UserSchema = z.object({
	id: z.string()
});

const SupervisorSchema = z.object({
	id: z.string(),
	user: UserSchema
});

const MemberSchema = z.object({
	id: z.string(),
	isHeadDelegate: z.boolean(),
	user: UserSchema,
	supervisors: z.optional(z.array(SupervisorSchema))
});

const AppliedForSingleRoleSchema = z.object({
	id: z.string(),
	fontAwesomeIcon: z.string().nullable(),
	name: z.string(),
	// See the matching comment on AppliedForDelegationRoleSchema above.
	rank: z.undefined().optional(),
	nation: z.undefined().optional(),
	nonStateActor: z.undefined().optional()
});

const SightingPropsSchema = z.object({
	evaluation: z.number().nullish(),
	flagged: z.boolean().nullish(),
	disqualified: z.boolean().nullish(),
	note: z.string().nullish()
});

const DelegationAssignmentSchema = z.object({
	assignedNation: NationSchema.nullish()
});

const NSAAssignmentSchema = z.object({
	assignedNSA: NonStateActorSchema.nullish()
});

const SingleAssignmentSchema = z.object({
	assignedRole: IndividualApplicationOptionSchema.nullish()
});

const ConferenceSchema = z.object({
	id: z.string(),
	title: z.string(),
	startConference: z.coerce.date(),
	committees: z.array(CommitteeSchema),
	nonStateActors: z.array(NonStateActorSchema),
	individualApplicationOptions: z.array(IndividualApplicationOptionSchema)
});

const DelegationSchema = z.object({
	id: z.string(),
	appliedForRoles: z.array(AppliedForDelegationRoleSchema),
	members: z.array(MemberSchema),
	school: z.string().optional(),
	// See the matching comment on AppliedForDelegationRoleSchema above.
	supervisors: z.undefined().optional(),
	user: z.undefined().optional(),
	splittedFrom: z.string().nullish(),
	splittedInto: z.array(z.string()).nullish(),
	...SightingPropsSchema.shape,
	...DelegationAssignmentSchema.shape,
	...NSAAssignmentSchema.shape
});

const SingleParticipantSchema = z.object({
	id: z.string(),
	user: UserSchema,
	appliedForRoles: z.array(AppliedForSingleRoleSchema),
	school: z.string().optional(),
	supervisors: z.optional(z.array(SupervisorSchema)),
	// See the matching comment on AppliedForDelegationRoleSchema above.
	members: z.undefined().optional(),
	splittedFrom: z.undefined().optional(),
	splittedInto: z.undefined().optional(),
	...SightingPropsSchema.shape,
	...SingleAssignmentSchema.shape
});

export const ProjectDataSchema = z.object({
	conference: ConferenceSchema,
	delegations: z.array(DelegationSchema),
	singleParticipants: z.array(SingleParticipantSchema)
});

export type ProjectNation = z.infer<typeof NationSchema>;
export type IndividualApplicationOption = z.infer<typeof IndividualApplicationOptionSchema>;
export type NonStateActor = z.infer<typeof NonStateActorSchema>;
export type ProjectDelegation = z.infer<typeof DelegationSchema>;
export type SingleParticipant = z.infer<typeof SingleParticipantSchema>;
export type Member = z.infer<typeof MemberSchema>;
type DelegationAssignment = z.infer<typeof DelegationAssignmentSchema>;
type NSAAssignment = z.infer<typeof NSAAssignmentSchema>;
type Conference = z.infer<typeof ConferenceSchema>;
export type ProjectData = z.infer<typeof ProjectDataSchema>;
/** A project as stored in localStorage. */
type Project = {
	id: string;
	created: string;
	fileName: string;
	data: ProjectData;
};

let allProjects: Project[] = $state([]);
let selectedProject: Project | undefined = $state();

export const loadProjects = async (projectId?: string | undefined) => {
	const projectsRaw = localStorage.getItem(RAW_DATA_KEY);
	if (projectsRaw) {
		allProjects = JSON.parse(projectsRaw);
		if (projectId) {
			selectedProject = allProjects.find((project) => project.id === projectId);
			return;
		}
	}
	goto(resolve('/assignment-assistant'));
};

const saveProjects = () => {
	localStorage.setItem(RAW_DATA_KEY, JSON.stringify(allProjects));
};

export const getProject = () => {
	return selectedProject;
};

export const getConference: () => Conference | undefined = () => {
	const project = getProject();
	if (!project) return undefined;
	return project.data.conference;
};

export const getApplications = () => {
	const project = getProject();
	if (!project) return [];
	return [
		...project.data.delegations.toSorted((a, b) => {
			if (a.members?.length !== b.members?.length) {
				return b.members?.length - a.members?.length;
			}
			return a.id.localeCompare(b.id);
		}),
		...project.data.singleParticipants
	];
};

export const getSchools = () => summarizeSchools(getApplications());

export const getDelegationApplications = () => {
	const project = getProject();
	if (!project) return [];
	return project.data.delegations.filter((x) => !x.disqualified);
};

export const getDelegationApplication = (id: string) => {
	return getDelegationApplications().find((delegation) => delegation.id === id);
};

export const getSingleApplications = () => {
	const project = getProject();
	if (!project) return [];
	return project.data.singleParticipants;
};

export const getSingleRoles = () => {
	const project = getProject();
	if (!project) return [];
	return project.data.conference.individualApplicationOptions;
};

export const getNations: () => {
	nation: ProjectNation;
	seats: number;
	committees: string[];
}[] = () => {
	const project = getProject();
	if (!project) return [];
	return nationSeats(project.data.conference.committees);
};

export const getNSAs: () => NonStateActor[] = () => {
	const project = getProject();
	if (!project) return [];
	return project.data.conference.nonStateActors;
};

export const getRemainingSeats = (assignment: ProjectNation | NonStateActor) =>
	remainingSeats(assignment, {
		delegations: getDelegationApplications(),
		nations: getNations(),
		nsas: getNSAs()
	});

export const getMoreInfoLink = (id: string) => {
	const project = getProject();
	if (!project) return undefined;
	if (project.data.singleParticipants.find((singleParticipant) => singleParticipant.id === id)) {
		return resolve(
			`/dashboard/${project.data.conference.id}/management/individuals?selected=${id}`
		);
	}
	return resolve(`/dashboard/${project.data.conference.id}/management/delegations?selected=${id}`);
};

export const evaluateApplication = (id: string, evaluation: number) => {
	const application = getApplications().find((application) => application.id === id);
	if (application) {
		application.evaluation = evaluation;
	}
	saveProjects();
};

export const addNote = (id: string, note: string) => {
	const application = getApplications().find((application) => application.id === id);
	if (application) {
		application.note = note ?? undefined;
	}
	saveProjects();
};

export const deleteEvaluation = (id: string) => {
	const application = getApplications().find((application) => application.id === id);
	if (application) {
		application.evaluation = undefined;
	}
	saveProjects();
};

export const toggleFlagApplication = (id: string) => {
	const application = getApplications().find((application) => application.id === id);
	if (application) {
		application.flagged = !application.flagged;
	}
	saveProjects();
};

export const toggleDisqualifyApplication = (id: string) => {
	const application = getApplications().find((application) => application.id === id);
	if (application) {
		application.disqualified = !application.disqualified;
	}
	saveProjects();
};

export const assignNationToDelegation = (delegationId: string, alpha3Code: string) => {
	const delegation = getDelegationApplications().find(
		(delegation) => delegation.id === delegationId
	);
	const nation = getNations().find((nation) => nation.nation.alpha3Code === alpha3Code)?.nation;
	if (delegation) {
		(delegation as DelegationAssignment).assignedNation = nation;
	}
	saveProjects();
};

export const assignNSAToDelegation = (delegationId: string, nsaId: string) => {
	const delegation = getDelegationApplications().find(
		(delegation) => delegation.id === delegationId
	);
	const nsa = getNSAs().find((nsa) => nsa.id === nsaId);
	if (!nsa) return;
	if (delegation) {
		(delegation as NSAAssignment).assignedNSA = nsa;
	}
	saveProjects();
};

export const unassignNationOrNSAFromDelegation = (delegationId: string) => {
	const delegation = getDelegationApplications().find(
		(delegation) => delegation.id === delegationId
	);
	if (delegation) {
		(delegation as DelegationAssignment).assignedNation = undefined;
		(delegation as NSAAssignment).assignedNSA = undefined;
	}
	saveProjects();
};

export const resetSeatCategory = (seats: number) => {
	getDelegationApplications().forEach((delegation) => {
		if (
			getNations().find(
				(nation) =>
					nation.nation.alpha3Code === delegation.assignedNation?.alpha3Code &&
					nation.seats === seats
			) ||
			getNSAs().find((nsa) => nsa.id === delegation.assignedNSA?.id && nsa.seatAmount === seats)
		) {
			unassignNationOrNSAFromDelegation(delegation.id);
		}
	});
	saveProjects();
};

export const splitDelegation = (delegationId: string, buckets: Member[][]) => {
	const delegation = getDelegationApplications().find(
		(delegation) => delegation.id === delegationId
	);
	if (!delegation) return;
	const splittedInto = buckets
		.filter((bucket) => bucket.length > 0) // Don't create empty delegations
		.map((bucket) => {
			const newDelegation: ProjectDelegation = JSON.parse(JSON.stringify(delegation));
			newDelegation.id = Math.round(Math.random() * 1000000).toString();
			newDelegation.members = bucket;
			newDelegation.splittedFrom = delegation.id;
			newDelegation.splittedInto = undefined;
			return newDelegation;
		});
	delegation.splittedInto = splittedInto.map((x) => x.id);
	delegation.disqualified = true;
	splittedInto.forEach((x) => {
		selectedProject?.data.delegations.push(x);
	});
	saveProjects();
};

export const convertSingleToDelegation = (singleId: string) => {
	const single = getSingleApplications().find((single) => single.id === singleId);
	if (!single) return;
	const newDelegation: ProjectDelegation = {
		id: single.id,
		members: [
			{
				id: Math.round(Math.random() * 1000000).toString(),
				isHeadDelegate: true,
				user: single.user,
				supervisors: single.supervisors
			}
		],
		appliedForRoles: [],
		splittedFrom: undefined,
		splittedInto: undefined,
		supervisors: undefined,
		user: undefined as never,
		// Copy sighting properties from single participant
		evaluation: single.evaluation,
		flagged: single.flagged,
		disqualified: single.disqualified,
		note: single.note,
		school: single.school,
		// Set assignment properties to undefined for delegations
		assignedNation: undefined,
		assignedNSA: undefined
	};
	selectedProject?.data.delegations.push(newDelegation);
	selectedProject!.data.singleParticipants = selectedProject!.data.singleParticipants.filter(
		(x) => x.id !== singleId
	);
	saveProjects();
};

export const assignSingleRole = (singleId: string, roleId: string) => {
	const single = getSingleApplications().find((single) => single.id === singleId);
	const role = getSingleRoles().find((role) => role.id === roleId);
	if (single && role) {
		single.assignedRole = role;
	} else {
		console.error("Couldn't find singleParticipant or role");
	}
	saveProjects();
};

export const unassignSingleRole = (singleId: string) => {
	const single = getSingleApplications().find((single) => single.id === singleId);
	if (single) {
		single.assignedRole = undefined;
	}
	saveProjects();
};
