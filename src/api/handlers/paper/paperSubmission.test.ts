import { describe, expect, test } from 'vitest';
import { paperSubmissionChanges } from './paperSubmission';

const now = new Date('2026-02-01T12:00:00Z');
const earlier = new Date('2026-01-01T12:00:00Z');

const unreviewed = { firstSubmittedAt: null, versions: [{ reviews: [] }] };
const reviewed = { firstSubmittedAt: earlier, versions: [{ reviews: [] }, { reviews: [{}] }] };

describe('paperSubmissionChanges', () => {
	test('marks the first submission', () => {
		expect(paperSubmissionChanges(unreviewed, 'SUBMITTED', now)).toEqual({
			status: 'SUBMITTED',
			firstSubmittedAt: now
		});
	});

	test('does not mark a draft as submitted', () => {
		expect(paperSubmissionChanges(unreviewed, 'DRAFT', now)).toEqual({
			status: 'DRAFT',
			firstSubmittedAt: undefined
		});
	});

	test('treats an update without a status as a submission, leaving the status alone', () => {
		expect(paperSubmissionChanges(unreviewed, null, now)).toEqual({
			status: undefined,
			firstSubmittedAt: now
		});
		expect(paperSubmissionChanges(unreviewed, undefined, now).status).toBeUndefined();
	});

	test('keeps the date of an earlier first submission', () => {
		expect(
			paperSubmissionChanges({ ...unreviewed, firstSubmittedAt: earlier }, 'SUBMITTED', now)
		).toEqual({ status: 'SUBMITTED', firstSubmittedAt: undefined });
	});

	test('counts a resubmission of a reviewed paper as revised', () => {
		expect(paperSubmissionChanges(reviewed, 'SUBMITTED', now).status).toBe('REVISED');
		expect(paperSubmissionChanges(reviewed, 'REVISED', now).status).toBe('REVISED');
	});

	test('never lets a client claim a revision of an unreviewed paper', () => {
		expect(paperSubmissionChanges(unreviewed, 'REVISED', now).status).toBe('SUBMITTED');
	});

	test('passes other statuses through', () => {
		expect(paperSubmissionChanges(reviewed, 'ACCEPTED', now).status).toBe('ACCEPTED');
		expect(paperSubmissionChanges(reviewed, 'DRAFT', now).status).toBe('DRAFT');
	});
});
