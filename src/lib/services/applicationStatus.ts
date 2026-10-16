export type ApplicationStatus = 'accepted' | 'pending' | 'applied' | 'rejected';

// Assignments may already exist while registration is still running; they are only revealed afterwards
export const getApplicationStatus = (
	isRegistrationPhase: boolean,
	hasAssignment: boolean,
	applied: boolean
): ApplicationStatus => {
	if (!isRegistrationPhase && hasAssignment) return 'accepted';
	if (!applied) return 'pending';
	return isRegistrationPhase ? 'applied' : 'rejected';
};
