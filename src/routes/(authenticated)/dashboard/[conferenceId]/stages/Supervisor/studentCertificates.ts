type Student = {
	user: {
		id: string;
		givenName?: string | null;
		familyName?: string | null;
		conferenceParticipants: readonly { didAttend: boolean; conference: { id: string } }[];
	};
};

export type StudentCertificateRow = ReturnType<typeof studentCertificateRows>[number];

/**
 * One row per student whose certificate their supervisor can hand out, by family name: whether
 * they attended this conference (only then the API signs one). A student listed twice (a
 * delegation and a single registration) appears once.
 */
export function studentCertificateRows({
	conferenceId,
	students
}: {
	conferenceId: string;
	students: readonly Student[];
}) {
	const byUser = new Map(students.map(({ user }) => [user.id, user]));
	return [...byUser.values()]
		.map((user) => ({
			userId: user.id,
			givenName: user.givenName ?? null,
			familyName: user.familyName ?? null,
			didAttend:
				user.conferenceParticipants.find((row) => row.conference.id === conferenceId)?.didAttend ??
				false
		}))
		.sort(
			(a, b) =>
				(a.familyName ?? '').localeCompare(b.familyName ?? '') ||
				(a.givenName ?? '').localeCompare(b.givenName ?? '')
		);
}
