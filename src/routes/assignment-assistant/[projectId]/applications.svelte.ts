import codenamize from '$lib/services/codenamize';
import { RoleCategory } from './roles.svelte';
import type { DelegationRole, SingleRole } from './roles.svelte';

export interface Application {
	id: string;
	readableId: string;
	category: RoleCategory.DELEGATON | RoleCategory.SINGLE | null;

	school: string;
	motivation: string;
	experience: string;

	roleWishes: string[];

	flagged: boolean;
	evaluation: number;
	disqualified: boolean;

	assignedRole: SingleRole | DelegationRole | null;
}

export interface DelegationApplication extends Application {
	members: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SingleApplication extends Application {}

const applications = $state<Application[]>([]);

export const getApplications: () => (DelegationApplication | SingleApplication)[] = () => {
	return applications;
};

export const addApplication = ({
	id,
	category,
	school,
	motivation,
	experience,
	roleWishes,
	number
}: {
	id: string;
	category: RoleCategory.DELEGATON | RoleCategory.SINGLE;
	school: string;
	motivation: string;
	experience: string;
	roleWishes: string[];
	number?: number;
}) => {
	const application = {
		id,
		readableId: codenamize(id),
		category,
		school,
		motivation,
		experience,
		roleWishes,
		flagged: false,
		disqualified: false,
		evaluation: 2.5,
		assignedRole: null
	};

	if (category === RoleCategory.DELEGATON && number) {
		(application as DelegationApplication).members = number;
	}
	applications.push(application);
};

export const toggleFlagApplication: (id: string) => void = (id) => {
	const application = applications.find((application) => application.id === id);
	if (application) {
		application.flagged = !application.flagged;
	}
};

export const evaluateApplication: (id: string, evaluation: number) => void = (id, evaluation) => {
	const application = applications.find((application) => application.id === id);
	if (application) {
		application.evaluation = evaluation;
	}
};

export const toggleDisqualifyApplication: (id: string) => void = (id) => {
	const application = applications.find((application) => application.id === id);
	if (application) {
		application.disqualified = !application.disqualified;
	}
};
