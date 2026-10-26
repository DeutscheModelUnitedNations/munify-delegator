import { beforeEach, describe, expect, test, vi } from 'vitest';

const updatePlace = vi.fn();
const createPlace = vi.fn();

vi.mock('#lib/api/rumbleClient/client.js', () => ({
	client: { mutate: { updatePlace, createPlace } }
}));

const { placeFields, resolvePlusCode, savePlaceFields } = await import('./placeForm');

const zurich = { latitude: 47.3769, longitude: 8.5417 };
const noCity = () => Promise.resolve(undefined);

describe('resolvePlusCode', () => {
	test('decodes a full code without looking anything up', async () => {
		const lookUpCity = vi.fn(noCity);
		const position = await resolvePlusCode('8fvc9g8f+6x', lookUpCity);
		expect(position).toMatchObject({ latitude: expect.closeTo(47.3655625, 6) });
		expect(lookUpCity).not.toHaveBeenCalled();
	});

	test('recovers a short code from the city named after it', async () => {
		const lookUpCity = vi.fn(() => Promise.resolve(zurich));
		const position = await resolvePlusCode('9G8F+6X Zürich', lookUpCity);
		expect(lookUpCity).toHaveBeenCalledWith('Zürich');
		expect(position).toMatchObject({
			latitude: expect.closeTo(47.3655625, 6),
			longitude: expect.closeTo(8.5249375, 6)
		});
	});

	test('tells what is missing', async () => {
		expect(await resolvePlusCode('not a code', noCity)).toEqual({ error: 'invalid' });
		expect(await resolvePlusCode('8FVC9G8A+6X', noCity)).toEqual({ error: 'invalid' });
		expect(await resolvePlusCode('9G8F+6X', noCity)).toEqual({ error: 'short' });
		expect(await resolvePlusCode('9G8F+6X Atlantis', noCity)).toEqual({ error: 'cityNotFound' });
	});
});

const values = {
	name: 'Town hall',
	address: '',
	latitude: '54.32',
	longitude: '',
	directions: 'Second floor',
	info: '',
	websiteUrl: ''
};

describe('placeFields', () => {
	test('stores empty inputs as none and coordinates as numbers', () => {
		expect(placeFields(values, 'file-1')).toEqual({
			name: 'Town hall',
			address: null,
			latitude: 54.32,
			longitude: null,
			directions: 'Second floor',
			info: null,
			websiteUrl: null,
			sitePlanFileId: 'file-1'
		});
	});
});

describe('savePlaceFields', () => {
	beforeEach(() => {
		updatePlace.mockReset();
		createPlace.mockReset();
	});

	test('updates the place being edited', async () => {
		const fields = placeFields(values, undefined);
		await savePlaceFields('c1', 'p1', fields);
		expect(updatePlace).toHaveBeenCalledWith({ __args: { id: 'p1', ...fields }, id: true });
		expect(createPlace).not.toHaveBeenCalled();
	});

	test('creates a place in the conference otherwise', async () => {
		const fields = placeFields(values, undefined);
		await savePlaceFields('c1', undefined, fields);
		expect(createPlace).toHaveBeenCalledWith({
			__args: { conferenceId: 'c1', ...fields },
			id: true
		});
		expect(updatePlace).not.toHaveBeenCalled();
	});
});
