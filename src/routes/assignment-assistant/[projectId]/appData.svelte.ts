import { goto } from '$app/navigation';
import { graphql } from '$houdini';
import { RAW_DATA_KEY } from '../local_storage_keys';
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
	id: z.string(),
	family_name: z.string(),
	given_name: z.string(),
	birthday: z.string().nullish()
});

export const MemberSchema = z.object({
	id: z.string(),
	isHeadDelegate: z.boolean(),
	user: UserSchema
});

export const SupervisorSchema = z.object({
	id: z.string(),
	delegations: z.array(z.object({ id: z.string() })),
	user: UserSchema
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
	committees: z.array(CommitteeSchema),
	nonStateActors: z.array(NonStateActorSchema),
	individualApplicationOptions: z.array(IndividualApplicationOptionSchema)
});

export const DelegationSchema = z
	.object({
		id: z.string(),
		motivation: z.string().nullish(),
		experience: z.string().nullish(),
		school: z.string().nullish(),
		appliedForRoles: z.array(AppliedForDelegationRoleSchema),
		members: z.array(MemberSchema),
		supervisors: z.array(SupervisorSchema),
		user: z.undefined(),
		splittedFrom: z.string().nullish(),
		splittedInto: z.array(z.string()).nullish()
	})
	.merge(SightingPropsSchema)
	.merge(DelegationAssignmentSchema)
	.merge(NSAAssignmentSchema);

export const SingleParticipantSchema = z
	.object({
		id: z.string(),
		motivation: z.string(),
		school: z.string(),
		experience: z.string(),
		user: UserSchema,
		appliedForRoles: z.array(AppliedForSingleRoleSchema),
		supervisors: z.undefined(),
		members: z.undefined(),
		splittedFrom: z.undefined(),
		splittedInto: z.undefined()
	})
	.merge(SightingPropsSchema)
	.merge(SingleAssignmentSchema);

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

let allProjects: Project[] = $state([]);
let selectedProject: Project | undefined = $state();

export const loadProjects = async (projectId?: string | undefined) => {
	const projectsRaw = localStorage.getItem(RAW_DATA_KEY);
	if (projectsRaw) {
		allProjects = JSON.parse(projectsRaw);
		if (projectId) {
			selectedProject = allProjects.find((project: any) => project.id === projectId);
			return;
		}
	}
	goto('/assignment-assistant');
};

export const saveProjects = () => {
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
	return [...project.data.delegations, ...project.data.singleParticipants];
};

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
	nation: Nation;
	seats: number;
	committees: string[];
}[] = () => {
	const project = getProject();
	if (!project) return [];
	const role: { nation: Nation; seats: number; committees: string[] }[] = [];
	project.data.conference.committees.forEach((committee) => {
		committee.nations.forEach((nation) => {
			const entry = role.find((role) => role.nation.alpha2Code === nation.alpha2Code);
			if (entry) {
				entry.seats += committee.numOfSeatsPerDelegation;
				entry.committees = [committee.abbreviation, ...entry.committees];
			} else {
				role.push({
					nation,
					seats: committee.numOfSeatsPerDelegation,
					committees: [committee.abbreviation]
				});
			}
		});
	});
	return role;
};

export const getNSAs: () => NonStateActor[] = () => {
	const project = getProject();
	if (!project) return [];
	return project.data.conference.nonStateActors;
};

export const getRemainingSeats = (assignment: Nation | NonStateActor) => {
	const delegations = getDelegationApplications().filter((x) => {
		const isNation = 'alpha2Code' in assignment;
		if (isNation) {
			return x.assignedNation?.alpha2Code === assignment.alpha2Code;
		}
		return x.assignedNSA?.id === assignment.id;
	});
	let seats = getNations().find(
		(x) => x.nation.alpha2Code === (assignment as Nation).alpha2Code
	)?.seats;
	if (!seats) {
		seats = getNSAs().find((x) => x.id === (assignment as NonStateActor).id)?.seatAmount;
	}
	return seats ? seats - delegations.reduce((acc, x) => acc + x.members.length, 0) : 0;
};

export const getMoreInfoLink = (id: string) => {
	const project = getProject();
	if (!project) return '';
	if (project.data.singleParticipants.find((singleParticipant) => singleParticipant.id === id)) {
		return `/management/${project.data.conference.id}/individuals?filter=${id}`;
	}
	return `/management/${project.data.conference.id}/delegations?filter=${id}`;
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
	const splittedInto = buckets.map((bucket) => {
		const newDelegation = { ...delegation };
		newDelegation.id = Math.round(Math.random() * 1000000).toString();
		newDelegation.members = bucket;
		newDelegation.splittedFrom = delegation.id;
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
	const newDelegation: Delegation = {
		id: single.id,
		motivation: single.motivation,
		experience: single.experience,
		school: single.school,
		members: [
			{
				id: Math.round(Math.random() * 1000000).toString(),
				isHeadDelegate: true,
				user: single.user
			}
		],
		appliedForRoles: [],
		supervisors: [],
		splittedFrom: undefined,
		splittedInto: undefined,
		user: undefined as never
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
