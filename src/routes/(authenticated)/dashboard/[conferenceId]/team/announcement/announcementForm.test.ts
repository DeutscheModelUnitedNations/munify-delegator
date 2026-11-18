import { describe, expect, test } from 'vitest';
import { announcementValues, type AnnouncementForm } from './announcementForm';

const form: AnnouncementForm = {
	title: 'Raumwechsel',
	body: 'Die GV tagt im Plenarsaal.',
	signature: '  Eure Orga ',
	importance: 'IMPORTANT',
	pinned: true,
	notifyByMail: true,
	visibleUntil: '2027-03-01T18:30',
	audiences: [{ kind: 'COMMITTEE', committeeId: 'c1', roleId: null }, { kind: 'SUPERVISORS' }]
};

describe('announcementValues', () => {
	test('reads the end in the conference time zone and sends each block reduced to its kind', () => {
		const values = announcementValues({
			form,
			timezone: 'Europe/Berlin',
			keptFileIds: ['f1'],
			uploadedFileIds: ['f2', null, undefined, 'f3']
		});
		expect(values).toMatchObject({
			title: 'Raumwechsel',
			signature: 'Eure Orga',
			importance: 'IMPORTANT',
			pinned: true,
			notifyByMail: true
		});
		// 18:30 in Berlin's winter is 17:30 UTC
		expect(values.visibleUntil?.toISOString()).toBe('2027-03-01T17:30:00.000Z');
		expect(values.audiences).toEqual([
			{ kind: 'COMMITTEE', committeeId: 'c1' },
			{ kind: 'SUPERVISORS' }
		]);
		// the kept files first, then the uploads that arrived
		expect(values.attachmentFileIds).toEqual(['f1', 'f2', 'f3']);
	});

	test('an empty signature and an empty end clear theirs', () => {
		const values = announcementValues({
			form: { ...form, signature: '   ', visibleUntil: '' },
			timezone: 'Europe/Berlin',
			keptFileIds: [],
			uploadedFileIds: []
		});
		expect(values.signature).toBeNull();
		expect(values.visibleUntil).toBeNull();
		expect(values.attachmentFileIds).toEqual([]);
	});
});
