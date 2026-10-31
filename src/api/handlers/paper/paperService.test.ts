import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({
	paperPubsub: { created: () => undefined, updated: () => undefined, removed: () => undefined },
	paperVersionPubsub: {
		created: () => undefined,
		updated: () => undefined,
		removed: () => undefined
	}
}));
import type * as schema from '#api/db/schema/index';
import {
	groupPapersByCommittee,
	newPaperRows,
	paperSubmissionChanges,
	reviewStatsFrom
} from './paperService';

const now = new Date('2026-02-01T12:00:00Z');
const earlier = new Date('2026-01-01T12:00:00Z');

const unreviewed = { firstSubmittedAt: null, versions: [{ reviews: [] }] };
const reviewed = { firstSubmittedAt: earlier, versions: [{ reviews: [] }, { reviews: [{}] }] };

describe('paperSubmissionChanges', () => {
	test('marks the first submission', () => {
		expect(
			paperSubmissionChanges({ paper: unreviewed, requestedStatus: 'SUBMITTED', now })
		).toEqual({
			status: 'SUBMITTED',
			firstSubmittedAt: now
		});
	});

	test('does not mark a draft as submitted', () => {
		expect(paperSubmissionChanges({ paper: unreviewed, requestedStatus: 'DRAFT', now })).toEqual({
			status: 'DRAFT',
			firstSubmittedAt: undefined
		});
	});

	test('treats an update without a status as a submission, leaving the status alone', () => {
		expect(paperSubmissionChanges({ paper: unreviewed, requestedStatus: null, now })).toEqual({
			status: undefined,
			firstSubmittedAt: now
		});
		expect(
			paperSubmissionChanges({ paper: unreviewed, requestedStatus: undefined, now }).status
		).toBeUndefined();
	});

	test('keeps the date of an earlier first submission', () => {
		expect(
			paperSubmissionChanges({
				paper: { ...unreviewed, firstSubmittedAt: earlier },
				requestedStatus: 'SUBMITTED',
				now
			})
		).toEqual({ status: 'SUBMITTED', firstSubmittedAt: undefined });
	});

	test('counts a resubmission of a reviewed paper as revised', () => {
		expect(
			paperSubmissionChanges({ paper: reviewed, requestedStatus: 'SUBMITTED', now }).status
		).toBe('REVISED');
		expect(
			paperSubmissionChanges({ paper: reviewed, requestedStatus: 'REVISED', now }).status
		).toBe('REVISED');
	});

	test('never lets a client claim a revision of an unreviewed paper', () => {
		expect(
			paperSubmissionChanges({ paper: unreviewed, requestedStatus: 'REVISED', now }).status
		).toBe('SUBMITTED');
	});

	test('passes other statuses through', () => {
		expect(
			paperSubmissionChanges({ paper: reviewed, requestedStatus: 'ACCEPTED', now }).status
		).toBe('ACCEPTED');
		expect(paperSubmissionChanges({ paper: reviewed, requestedStatus: 'DRAFT', now }).status).toBe(
			'DRAFT'
		);
	});
});

describe('newPaperRows', () => {
	const base = {
		conferenceId: 'c',
		authorParticipantId: 'author',
		delegationId: 'del',
		type: 'POSITION_PAPER' as const
	};

	test('stamps a paper that goes straight out as submitted', () => {
		const rows = newPaperRows({
			args: { ...base, status: 'SUBMITTED', content: { text: 'x' } },
			now
		});
		expect(rows.paper).toEqual({
			authorParticipantId: 'author',
			delegationId: 'del',
			agendaItemId: undefined,
			type: 'POSITION_PAPER',
			status: 'SUBMITTED',
			firstSubmittedAt: now
		});
		expect(rows.version).toEqual({ content: { text: 'x' }, status: 'SUBMITTED', version: 1 });
	});

	test('leaves a draft unstamped and unset fields to their defaults', () => {
		const rows = newPaperRows({ args: { ...base, status: null, agendaItemId: null }, now });
		expect(rows.paper).toMatchObject({
			agendaItemId: undefined,
			status: undefined,
			firstSubmittedAt: undefined
		});
		expect(rows.version).toEqual({ content: undefined, status: undefined, version: 1 });
		expect(
			newPaperRows({ args: { ...base, status: 'DRAFT', agendaItemId: 'a' }, now }).paper
		).toMatchObject({
			agendaItemId: 'a',
			status: 'DRAFT',
			firstSubmittedAt: undefined
		});
	});
});

describe('reviewStatsFrom', () => {
	const review = (reviewerId: string, paperId: string) => ({
		reviewerId,
		paperVersion: { paperId }
	});

	test('counts the papers someone reviewed first, and their reviews after someone else', () => {
		const reviews = [
			review('me', 'p1'),
			review('other', 'p2'),
			review('me', 'p2'),
			review('me', 'p1'),
			review('other', 'p3')
		];
		expect(reviewStatsFrom({ reviews, callerId: 'me' })).toEqual({
			firstReviews: 1,
			followUpReviews: 2,
			totalReviews: 3
		});
		expect(reviewStatsFrom({ reviews, callerId: 'other' })).toEqual({
			firstReviews: 2,
			followUpReviews: 0,
			totalReviews: 2
		});
	});

	test('has nothing for someone who never reviewed', () => {
		expect(reviewStatsFrom({ reviews: [review('other', 'p1')], callerId: 'me' })).toEqual({
			firstReviews: 0,
			followUpReviews: 0,
			totalReviews: 0
		});
	});
});

describe('groupPapersByCommittee', () => {
	const stamps = { createdAt: now, updatedAt: now };
	const committee = (id: string): typeof schema.committee.$inferSelect => ({
		id,
		...stamps,
		name: id,
		abbreviation: id,
		conferenceId: 'c',
		numOfSeatsPerDelegation: 1,
		resolutionHeadline: null,
		regionalBaseline: 'UN_MEMBERS',
		regionalBaselineTargets: []
	});
	const agendaItem = (id: string, of: typeof schema.committee.$inferSelect | null) => ({
		id,
		...stamps,
		title: id,
		teaserText: null,
		committeeId: of?.id ?? 'gone',
		reviewHelpStatus: 'UNSPECIFIED' as const,
		committee: of
	});
	const paper = (id: string, item: ReturnType<typeof agendaItem> | null) => ({
		id,
		...stamps,
		authorParticipantId: 'author',
		delegationId: 'del',
		status: 'SUBMITTED' as const,
		agendaItemId: item?.id ?? null,
		type: 'POSITION_PAPER' as const,
		firstSubmittedAt: null,
		agendaItem: item
	});

	test('nests papers by committee, then agenda item, in the order they come', () => {
		const ga = committee('GA');
		const sc = committee('SC');
		const climate = agendaItem('climate', ga);
		const water = agendaItem('water', ga);
		const peace = agendaItem('peace', sc);
		const groups = groupPapersByCommittee([
			paper('p1', climate),
			paper('p2', peace),
			paper('p3', water),
			paper('p4', climate)
		]);
		expect(
			groups.map((group) => [
				group.committee.id,
				group.agendaItems.map((item) => [item.agendaItem.id, item.papers.map((p) => p.id)])
			])
		).toEqual([
			[
				'GA',
				[
					['climate', ['p1', 'p4']],
					['water', ['p3']]
				]
			],
			['SC', [['peace', ['p2']]]]
		]);
	});

	test('skips papers without an agenda item or whose agenda item has no committee', () => {
		expect(
			groupPapersByCommittee([paper('intro', null), paper('orphan', agendaItem('x', null))])
		).toEqual([]);
	});
});
