type PreviewSchool = { id: string; name: string; city: string | null };

/** What `previewSupervisorByCode` loads about the supervisor a code names. */
export interface PreviewedSupervisor {
	user: { givenName: string; familyName: string } | null;
	participant: { school: PreviewSchool | null } | null;
}

const nameOf = (user: PreviewedSupervisor['user']) => ({
	given_name: user?.givenName ?? null,
	family_name: user?.familyName ?? null
});

const placeOf = (school: PreviewSchool | null) => ({
	school_name: school?.name ?? null,
	school_city: school?.city ?? null
});

/**
 * Whose supervision a participant is about to accept, as the connect form shows it. `callerSchoolId`
 * is the school of the person looking, if they have one.
 */
export function supervisorPreview(
	supervisor: PreviewedSupervisor,
	callerSchoolId: string | null | undefined
) {
	// The supervisor's own school.
	const school = supervisor.participant?.school ?? null;
	return {
		...nameOf(supervisor.user),
		...placeOf(school),
		// Only when both schools are known: a missing one is no reason to warn.
		different_school: !!school && !!callerSchoolId && school.id !== callerSchoolId
	};
}
