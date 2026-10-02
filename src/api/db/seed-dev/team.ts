import { createHash } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { devEmail, type DevAccountSub } from '../seed-data/devAccounts';
import { makeSeedTeamMember } from '../seed-data/teamMember';
import { snippetDocument } from '../seed-data/content';
import type { SeedBatch } from './batch';
import type { ConferenceSeed } from './context';
import { invitationTokens } from './plans';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Each team persona's role, the same in every conference. */
const TEAM_PERSONAS: [
	DevAccountSub,
	'PROJECT_MANAGEMENT' | 'PARTICIPANT_CARE' | 'TEAM_COORDINATOR' | 'REVIEWER' | 'MEMBER'
][] = [
	['dev-team-pm', 'PROJECT_MANAGEMENT'],
	['dev-team-care', 'PARTICIPANT_CARE'],
	['dev-team-coordinator', 'TEAM_COORDINATOR'],
	['dev-team-reviewer', 'REVIEWER'],
	['dev-team-member', 'MEMBER']
];

/** As `invitationToken.ts` stores it: only the SHA-256 of the token the link carries. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function addTeam(cs: ConferenceSeed) {
	for (const [userId, role] of TEAM_PERSONAS) {
		cs.batch.teamMember.push({ conferenceId: cs.id, userId, role });
	}
	for (let index = 0; index < cs.plan.crowd.team; index++) {
		cs.batch.teamMember.push(
			makeSeedTeamMember({ conferenceId: cs.id, userId: cs.world.crowdUser('team') })
		);
	}

	if (!cs.plan.with.invitations) return;

	const now = Date.now();
	const invitation = (
		token: string,
		email: string,
		state: { expiresInDays: number; usedBy?: DevAccountSub; revoked?: boolean }
	) => {
		const createdAt = new Date(now - 3 * DAY_MS);
		cs.batch.teamMemberInvitation.push({
			conferenceId: cs.id,
			email,
			role: state.usedBy ? 'MEMBER' : faker.helpers.arrayElement(['REVIEWER', 'MEMBER'] as const),
			token: hashToken(token),
			createdAt,
			expiresAt: new Date(now + state.expiresInDays * DAY_MS),
			usedAt: state.usedBy ? new Date(now - 2 * DAY_MS) : null,
			acceptedById: state.usedBy ?? null,
			revokedAt: state.revoked ? new Date(now - DAY_MS) : null,
			invitedById: 'dev-team-pm'
		});
	};
	invitation(invitationTokens.pending, devEmail('dev-team-invitee'), { expiresInDays: 4 });
	invitation(invitationTokens.expired, 'expired-invitee@delegator.local', { expiresInDays: -1 });
	invitation(invitationTokens.revoked, 'revoked-invitee@delegator.local', {
		expiresInDays: 4,
		revoked: true
	});
	invitation(invitationTokens.used, devEmail('dev-team-member'), {
		expiresInDays: 4,
		usedBy: 'dev-team-member'
	});
}

/** Saved review snippets, one with placeholders the reviewer fills in on insertion. */
export function addReviewerSnippets(batch: SeedBatch) {
	batch.reviewerSnippet.push(
		{
			userId: 'dev-team-reviewer',
			name: 'Begrüßung',
			content: snippetDocument('Liebe Delegation von {{Land}}, vielen Dank für euer Papier!')
		},
		{
			userId: 'dev-team-reviewer',
			name: 'Quellen fehlen',
			content: snippetDocument('Bitte belegt eure Aussagen mit Quellen, insbesondere zu {{Thema}}.')
		},
		{
			userId: 'dev-team-pm',
			name: 'Angenommen',
			content: snippetDocument('Das Papier ist angenommen. Viel Erfolg in der Debatte!')
		}
	);
}
