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

export interface Delegation extends SightingProps {
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
