import { describe, expect, test } from 'vitest';
import { studentCertificateRows } from './studentCertificates';

const student = ({
	id,
	familyName,
	didAttend,
	conferenceId = 'mun-sh'
}: {
	id: string;
	familyName: string;
	didAttend: boolean;
	conferenceId?: string;
}) => ({
	user: {
		id,
		givenName: 'Kim',
		familyName,
		conferenceParticipants: [{ didAttend, conference: { id: conferenceId } }]
	}
});

describe('studentCertificateRows', () => {
	test('lists each student once, by family name, with whether they attended', () => {
		const rows = studentCertificateRows({
			conferenceId: 'mun-sh',
			students: [
				student({ id: 'b', familyName: 'Zuse', didAttend: true }),
				student({ id: 'a', familyName: 'Lovelace', didAttend: false }),
				student({ id: 'b', familyName: 'Zuse', didAttend: true })
			]
		});
		expect(rows).toEqual([
			{ userId: 'a', givenName: 'Kim', familyName: 'Lovelace', didAttend: false },
			{ userId: 'b', givenName: 'Kim', familyName: 'Zuse', didAttend: true }
		]);
	});

	test('counts attendance at this conference only', () => {
		const [row] = studentCertificateRows({
			conferenceId: 'mun-sh',
			students: [student({ id: 'a', familyName: 'L', didAttend: true, conferenceId: 'munbw' })]
		});
		expect(row.didAttend).toBe(false);
	});
});
