import { describe, expect, it } from 'vitest';
import { settingLines, type SettingsMember } from './settingLines';

const chair: SettingsMember = {
	id: 'tm1',
	userId: 'u1',
	role: 'PARTICIPANT_CARE',
	functions: [
		{
			id: 'f-ga',
			committeeId: 'ga',
			kind: 'CHAIR',
			committee: { abbreviation: 'GA', name: 'Generalversammlung' }
		}
	]
};

describe('settingLines', () => {
	it('lists a line per topic with the defaults', () => {
		const lines = settingLines({ member: chair, preferences: [], mailByDefault: true });
		expect(lines).toEqual([
			{
				id: 'tm1:PARTICIPANT_CARE:',
				topic: 'PARTICIPANT_CARE',
				teamFunctionId: null,
				functionKind: null,
				committeeAbbreviation: null,
				committeeName: null,
				email: true,
				slack: true
			},
			{
				id: 'tm1:COMMITTEE_INBOX:f-ga',
				topic: 'COMMITTEE_INBOX',
				teamFunctionId: 'f-ga',
				functionKind: 'CHAIR',
				committeeAbbreviation: 'GA',
				committeeName: 'Generalversammlung',
				email: true,
				slack: true
			},
			{
				id: 'tm1:COMMITTEE_PAPERS:f-ga',
				topic: 'COMMITTEE_PAPERS',
				teamFunctionId: 'f-ga',
				functionKind: 'CHAIR',
				committeeAbbreviation: 'GA',
				committeeName: 'Generalversammlung',
				email: true,
				slack: true
			},
			expect.objectContaining({ id: 'tm1:CHAT_REPORT:', topic: 'CHAT_REPORT' })
		]);
	});

	it('shows the stored choices on their own line and channel', () => {
		const lines = settingLines({
			member: chair,
			preferences: [
				{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-ga', channel: 'SLACK', enabled: false },
				{ topic: 'CHAT_REPORT', teamFunctionId: null, channel: 'EMAIL', enabled: false }
			],
			mailByDefault: true
		});
		expect(lines.map(({ topic, email, slack }) => ({ topic, email, slack }))).toEqual([
			{ topic: 'PARTICIPANT_CARE', email: true, slack: true },
			{ topic: 'COMMITTEE_INBOX', email: true, slack: false },
			{ topic: 'COMMITTEE_PAPERS', email: true, slack: true },
			{ topic: 'CHAT_REPORT', email: false, slack: true }
		]);
	});

	it('starts with mail off for whoever switched the unread mails off before', () => {
		const lines = settingLines({ member: chair, preferences: [], mailByDefault: false });
		expect(lines.every((line) => !line.email && line.slack)).toBe(true);
	});

	it('is empty for a member who answers nothing', () => {
		const plain = { id: 'tm2', userId: 'u2', role: 'MEMBER', functions: [] };
		expect(settingLines({ member: plain, preferences: [], mailByDefault: true })).toEqual([]);
	});

	it('names a function whose committee was not loaded by its kind alone', () => {
		const bare: SettingsMember = {
			...chair,
			role: 'MEMBER',
			functions: [{ id: 'f-sc', committeeId: 'sc', kind: 'CONSULTANT' }]
		};
		expect(settingLines({ member: bare, preferences: [], mailByDefault: true })).toEqual([
			expect.objectContaining({
				functionKind: 'CONSULTANT',
				committeeAbbreviation: null,
				committeeName: null
			})
		]);
	});
});
