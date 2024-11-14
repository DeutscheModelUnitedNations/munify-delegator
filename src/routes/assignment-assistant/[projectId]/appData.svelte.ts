import { goto } from '$app/navigation';
import { RAW_DATA_KEY } from '../local_storage_keys';

interface Project {
	id: string;
	created: string;
	fileName: string;
	data: ProjectData;
}

interface ProjectData {
	conference: Conference;
	delegations: Delegation[];
	singleParticipants: SingleParticipant[];
}

export interface Conference {
	id: string;
	title: string;
	committees: Committee[];
	individualApplicationOptions: IndividualApplicationOption[];
}

export interface Committee {
	id: string;
	name: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	nations: Nation[];
}

export interface Nation {
	alpha2Code: string;
	alpha3Code: string;
}

export interface IndividualApplicationOption {
	id: string;
	name: string;
	fontAwesomeIcon: string | null;
}

export interface Delegation extends SightingProps, DelegationAssignment, NSAAssignment {
	id: string;
	motivation: string;
	experience: string;
	school: string;
	appliedForRoles: AppliedForDelegationRole[];
	members: Member[];
	supervisors: Supervisor[];
	user: never;
}

export interface AppliedForDelegationRole {
	id: string;
	rank: number;
	nation?: Nation;
	nonStateActor?: NonStateActor;
	fontAwesomeIcon: never;
	name: never;
}

export interface NonStateActor {
	id: string;
	name: string;
	abbreviation: string;
	fontAwesomeIcon: string | null;
	seatAmount: number;
}

export interface Member {
	id: string;
	isHeadDelegate: boolean;
	user: User;
}

export interface User {
	id: string;
	family_name: string;
	given_name: string;
	birthday?: string;
}

export interface Supervisor {
	id: string;
	delegations: { id: string }[];
	user: User;
}

export interface SingleParticipant extends SightingProps {
	id: string;
	motivation: string;
	school: string;
	experience: string;
	user: User;
	appliedForRoles: AppliedForSingleRole[];
	supervisors: never;
	members: never;
}

export interface AppliedForSingleRole {
	id: string;
	fontAwesomeIcon: string | null;
	name: string;
	rank: never;
	nation?: never;
	nonStateActor?: never;
}

export interface SightingProps {
	evaluation?: number;
	flagged?: boolean;
	disqualified?: boolean;
	note?: string;
}

export interface DelegationAssignment {
	assignedNation?: Nation;
}

export interface NSAAssignment {
	assignedNSA: NonStateActor;
}

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

export const getNations: () => {
	nation: Nation;
	seats: number;
	committees: string[];
}[] = () => {
	const project = getProject();
	if (!project) return [];
	let role: { nation: Nation; seats: number; committees: string[] }[] = [];
	project.data.conference.committees.forEach((committee) => {
		committee.nations.forEach((nation) => {
			let entry = role.find((role) => role.nation.alpha2Code === nation.alpha2Code);
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

export const getRemainingSeats = (nation: Nation) => {
	const delegations = getDelegationApplications().filter(
		(x) => x.assignedNation?.alpha2Code === nation.alpha2Code
	);
	const seats = getNations().find((x) => x.nation.alpha2Code === nation.alpha2Code)?.seats;
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
		note ? (application.note = note) : (application.note = undefined);
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

export const unassignNationFromDelegation = (delegationId: string) => {
	const delegation = getDelegationApplications().find(
		(delegation) => delegation.id === delegationId
	);
	if (delegation) {
		(delegation as DelegationAssignment).assignedNation = undefined;
	}
	saveProjects();
};

export const resetSeatCategory = (seats: number) => {
	const nations = getNations()
		.filter((x) => x.seats === seats)
		.map((x) => x.nation);
	getDelegationApplications().forEach((delegation) => {
		if (delegation.members.length === seats) {
			unassignNationFromDelegation(delegation.id);
		}
	});
	saveProjects();
};
