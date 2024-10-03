import { invalidateAll } from '$app/navigation';
import { getApi } from '$lib/global/apiState.svelte';
import type { Conference, ConferenceStatus } from '@prisma/client';
import * as m from '$lib/paraglide/messages';

const DATE_FORMAT = 'dd.MM.yyyy';

let conferenceTitle = $state<string>('');
let conferenceLongTitle = $state<string>('');
let conferenceLocation = $state<string>('');
let conferenceLanguage = $state<string>('');
let conferenceWebsite = $state<string>('');
let conferenceStart = $state<Date | undefined>(undefined);
let conferenceEnd = $state<Date | undefined>(undefined);
let conferenceStartRegistration = $state<Date | undefined>(undefined);
let conferenceEndRegistration = $state<Date | undefined>(undefined);
let conferenceImage = $state<string | null | undefined>(null);
let conferenceStatus = $state<ConferenceStatus>('PRE');

export function conferenceForm() {
	const submit = async (e: Event, conferenceId: string) => {
		e.preventDefault();
		if (!confirm(m.conferenceDataSavingPrompt())) return;
		await getApi()
			.conference({ id: conferenceId })
			.patch({
				title: conferenceTitle,
				longTitle: conferenceLongTitle,
				location: conferenceLocation,
				language: conferenceLanguage,
				website: conferenceWebsite,
				start: conferenceStart ? conferenceStart : null,
				end: conferenceEnd ? conferenceEnd : null,
				startRegistration: conferenceStartRegistration ? conferenceStartRegistration : null,
				endRegistration: conferenceEndRegistration ? conferenceEndRegistration : null,
				imageDataUrl: conferenceImage ? conferenceImage : null,
				status: conferenceStatus
			});
		invalidateAll();
	};

	const setAllFromConferenceData = (conferenceData: Conference) => {
		setConferenceTitle(conferenceData.title);
		setConferenceLongTitle(conferenceData.longTitle);
		setConferenceLocation(conferenceData.location);
		setConferenceLanguage(conferenceData.language);
		setConferenceWebsite(conferenceData.website);
		setConferenceStart(conferenceData.start);
		setConferenceEnd(conferenceData.end);
		setConferenceStartRegistration(conferenceData.startRegistration);
		setConferenceEndRegistration(conferenceData.endRegistration);
		setImage(conferenceData.imageDataUrl);
	};

	const getConferenceTitle = () => {
		return conferenceTitle;
	};

	const setConferenceTitle = (value: string) => {
		conferenceTitle = value;
	};

	const getConferenceLongTitle = () => {
		return conferenceLongTitle;
	};

	const setConferenceLongTitle = (value: string | null | undefined) => {
		conferenceLongTitle = value || '';
	};

	const getConferenceLocation = () => {
		return conferenceLocation;
	};

	const setConferenceLocation = (value: string | null | undefined) => {
		conferenceLocation = value || '';
	};

	const getConferenceLanguage = () => {
		return conferenceLanguage;
	};

	const setConferenceLanguage = (value: string | null | undefined) => {
		conferenceLanguage = value || '';
	};

	const getConferenceWebsite = () => {
		return conferenceWebsite;
	};

	const setConferenceWebsite = (value: string | null | undefined) => {
		conferenceWebsite = value || '';
	};

	const getConferenceStart = () => {
		return conferenceStart;
	};

	const setConferenceStart = (value: string | Date | null | undefined) => {
		if (value !== null && value !== undefined) {
			conferenceStart = new Date(value);
			conferenceStart.setHours(12, 0, 0, 0); // To prevent timezone issues
		} else {
			conferenceStart = undefined;
		}
	};

	const getConferenceEnd = () => {
		return conferenceEnd;
	};

	const setConferenceEnd = (value: string | Date | null | undefined) => {
		if (value !== null && value !== undefined) {
			conferenceEnd = new Date(value);
			conferenceEnd.setHours(12, 0, 0, 0); // To prevent timezone issues
		} else {
			conferenceEnd = undefined;
		}
	};

	const getConferenceStartRegistration = () => {
		return conferenceStartRegistration;
	};

	const setConferenceStartRegistration = (value: string | Date | null | undefined) => {
		if (value !== null && value !== undefined) {
			conferenceStartRegistration = new Date(value);
		} else {
			conferenceStartRegistration = undefined;
		}
	};

	const getConferenceEndRegistration = () => {
		return conferenceEndRegistration;
	};

	const setConferenceEndRegistration = (value: string | Date | null | undefined) => {
		if (value !== null && value !== undefined) {
			conferenceEndRegistration = new Date(value);
		} else {
			conferenceEndRegistration = undefined;
		}
	};

	const getImage = () => {
		return conferenceImage;
	};

	const setImage = (value: string | null | undefined) => {
		conferenceImage = value;
	};

	const getConferenceStatus = () => {
		return conferenceStatus;
	};

	const setConferenceStatus = (value: ConferenceStatus) => {
		conferenceStatus = value;
	};

	return {
		submit,
		setAllFromConferenceData,
		getConferenceTitle,
		setConferenceTitle,
		getConferenceLongTitle,
		setConferenceLongTitle,
		getConferenceLocation,
		setConferenceLocation,
		getConferenceLanguage,
		setConferenceLanguage,
		getConferenceWebsite,
		setConferenceWebsite,
		getConferenceStart,
		setConferenceStart,
		getConferenceEnd,
		setConferenceEnd,
		getConferenceStartRegistration,
		setConferenceStartRegistration,
		getConferenceEndRegistration,
		setConferenceEndRegistration,
		getImage,
		setImage,
		getConferenceStatus,
		setConferenceStatus
	};
}
