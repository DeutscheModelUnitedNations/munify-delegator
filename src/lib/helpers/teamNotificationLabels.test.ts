import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { notificationTopicLabel } from './teamNotificationLabels';

describe('notificationTopicLabel', () => {
	test.each([
		['PARTICIPANT_CARE', m.chatInboxParticipantCare()],
		['TRUSTED_SHARED', m.chatInboxTrustedPersons()],
		['TRUSTED_PERSONAL', m.notificationTopicTrustedPersonal()],
		['CHAT_REPORT', m.notificationTopicChatReport()],
		['SCAN_PROBLEM', m.notificationTopicScanProblem()]
	] as const)('names %s', (topic, label) => {
		expect(notificationTopicLabel({ topic })).toBe(label);
	});

	test('names a committee’s inbox and papers by the function and the committee', () => {
		expect(
			notificationTopicLabel({
				topic: 'COMMITTEE_INBOX',
				functionKind: 'CHAIR',
				committeeAbbreviation: 'GV'
			})
		).toBe(`${m.chatInboxChairs()} GV`);
		expect(notificationTopicLabel({ topic: 'COMMITTEE_INBOX', functionKind: 'CONSULTANT' })).toBe(
			m.chatInboxConsultants()
		);
		expect(
			notificationTopicLabel({
				topic: 'COMMITTEE_PAPERS',
				functionKind: 'CONSULTANT',
				committeeAbbreviation: 'SR'
			})
		).toBe(`${m.notificationTopicConsultantPapers()} SR`);
		expect(notificationTopicLabel({ topic: 'COMMITTEE_PAPERS' })).toBe(
			m.notificationTopicChairPapers()
		);
	});
});
