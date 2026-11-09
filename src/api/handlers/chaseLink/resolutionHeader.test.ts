import { describe, expect, it } from 'vitest';
import { emblemFileOf, resolutionHeader, resolutionTitle } from './resolutionHeader';

const resolution = {
	paperId: 'paper',
	snapshotId: 'snap',
	title: 'Climate',
	documentNumber: 'GA/1',
	committeeId: 'ga',
	agendaItemId: 'climate'
};

const committee = {
	abbreviation: 'GA',
	name: 'General Assembly',
	resolutionHeadline: 'The General Assembly,',
	agendaItems: [{ id: 'climate', title: 'Climate change' }]
};

describe('resolutionHeader', () => {
	it("prints the conference's titles, the committee and the agenda item as topic", () => {
		expect(
			resolutionHeader({
				resolution,
				conference: { title: 'MUN-SH', longTitle: 'Model United Nations Schleswig-Holstein' },
				committee
			})
		).toEqual({
			conferenceName: 'MUN-SH',
			conferenceTitle: 'Model United Nations Schleswig-Holstein',
			committeeAbbreviation: 'GA',
			committeeFullName: 'General Assembly',
			committeeResolutionHeadline: 'The General Assembly,',
			documentNumber: 'GA/1',
			topic: 'Climate change'
		});
	});

	it('falls back to the short title and to generic names, and leaves out what is unknown', () => {
		expect(resolutionHeader({ resolution, conference: { title: 'MUN-SH' } })).toEqual({
			conferenceName: 'MUN-SH',
			conferenceTitle: 'MUN-SH',
			committeeAbbreviation: undefined,
			committeeFullName: undefined,
			committeeResolutionHeadline: undefined,
			documentNumber: 'GA/1',
			topic: undefined
		});
		expect(resolutionHeader({ resolution })).toMatchObject({
			conferenceName: 'Model UN',
			conferenceTitle: 'Model United Nations'
		});
	});

	it('names no topic for an agenda item the committee does not have', () => {
		const elsewhere = { ...resolution, agendaItemId: 'other' };
		expect(resolutionHeader({ resolution: elsewhere, committee }).topic).toBeUndefined();
	});
});

describe('resolutionTitle', () => {
	it("is the paper's title, else its document number", () => {
		expect(resolutionTitle({ title: 'Climate', documentNumber: 'GA/1' })).toBe('Climate');
		expect(resolutionTitle({ title: undefined, documentNumber: 'GA/1' })).toBe('GA/1');
		expect(resolutionTitle({ title: undefined, documentNumber: undefined })).toBeTruthy();
	});
});

describe('emblemFileOf', () => {
	const bytes = new Uint8Array([1, 2, 3]);

	it("writes the conference's emblem under its type's extension", () => {
		expect(emblemFileOf({ mimeType: 'image/png', bytes })).toEqual({ path: 'emblem.png', bytes });
	});

	it("falls back to the UN's for no emblem or a type Typst cannot show", () => {
		expect(emblemFileOf(null).path).toBe('emblem.svg');
		expect(emblemFileOf({ mimeType: 'image/webp', bytes }).path).toBe('emblem.svg');
		expect(emblemFileOf({ mimeType: 'image/webp', bytes }).bytes).not.toBe(bytes);
	});
});
