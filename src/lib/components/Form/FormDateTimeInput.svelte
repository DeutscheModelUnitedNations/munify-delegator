<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm, type FormPathLeaves, formFieldProxy } from 'sveltekit-superforms';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { isMobileOrTablet } from '$lib/services/detectMobile';
	import { onMount } from 'svelte';
	import FormLabel from './FormLabel.svelte';
	import FormDescription from './FormDescription.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { dateToFormValue, dateToInputValue, inputValueToDate } from '$lib/services/dateTimeInput';

	// Dates and Date pickers in JS are a mess. I tried around a lot of things with this
	// but all of non native inputs break acceissibility. According to this suggestion
	// hiding the native input and displaying a formatted string is the best solution:
	// https://stackoverflow.com/a/31162426/11988368

	interface Props {
		name: string;
		label?: string;
		description?: string;
		form: SuperForm<A, B>;
		enableTime?: boolean;
		showYearControls?: boolean;
		enableFutureDates?: boolean;
		enablePastDates?: boolean;
		defaultYear?: number;
		isMultipane?: boolean;
		disabled?: boolean;
	}

	let {
		form,
		label,
		description,
		name,
		showYearControls = true,
		enableTime = false,
		enableFutureDates = true,
		enablePastDates = true,
		defaultYear = new Date().getFullYear(),
		isMultipane = false,
		disabled = false
	}: Props = $props();

	let format: 'datetime-local' | 'date' = enableTime ? 'datetime-local' : 'date';

	let isNonNativeDatepickerOpen = $state(false);

	type DateField = Date | undefined;
	const {
		value: field,
		errors,
		constraints
	} = formFieldProxy<A, FormPathLeaves<A, DateField>, DateField>(
		form,
		name as FormPathLeaves<A, DateField>
	);
	let nativeDateInput = $state<HTMLInputElement>();

	/** The value currently held by the form store, as a valid Date or undefined. */
	let currentDate = $derived.by(() => {
		const value = $field;
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
		return value;
	});

	let inputValue = $derived(dateToInputValue(currentDate, enableTime));

	// The native input only ever yields a wall-clock string without any timezone info
	// ("2026-02-20T09:00"). Posting that string would make the server parse it in the
	// *server's* timezone, silently shifting the instant on every save. We therefore
	// submit an absolute ISO instant through a hidden field instead, which is
	// unambiguous no matter which timezone the server runs in.
	let submittedValue = $derived(dateToFormValue(currentDate));

	function setDate(date: DateField) {
		field.set(date);
	}

	function handleInput(value: string) {
		setDate(inputValueToDate(value, enableTime));
	}

	let localizedDateString = $derived.by(() => {
		if (!currentDate) return m.selectADate();
		if (enableTime) {
			return currentDate.toLocaleDateString(getLocale(), {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			});
		} else {
			return currentDate.toLocaleDateString(getLocale(), {
				timeZone: 'UTC',
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		}
	});

	function open() {
		//TODO we disable the non native datepicker for now since it returns timestamps in
		// a different timezone which js misinterprets when running the following line
		// we should consider another datepicker
		// if (isMobileOrTablet()) {
		if (!nativeDateInput) throw new Error('Native date input not found');
		nativeDateInput.showPicker();
		// } else {
		// 	isNonNativeDatepickerOpen = true;
		// }
	}

	function nonNativeDatePickEvent(e: { startDate: string | number | Date; startDateTime: string }) {
		const newDate = new SvelteDate(e.startDate);
		if (enableTime) {
			const timeNumbers = e.startDateTime.split(':').map(Number) as number[];
			newDate.setHours(
				timeNumbers.at(0) ?? 0,
				timeNumbers.at(1) ?? 0,
				timeNumbers.at(2) ?? 0,
				timeNumbers.at(3) ?? 0
			);
		}

		setDate(new Date(newDate.getTime()));
	}
</script>

<DatePicker
	onDayClick={nonNativeDatePickEvent}
	startDate={new SvelteDate(currentDate ?? new Date())}
	bind:isOpen={isNonNativeDatepickerOpen}
	{enableFutureDates}
	{enablePastDates}
	{isMultipane}
	{showYearControls}
	{defaultYear}
	showTimePicker={enableTime}
	isRange={false}
	includeFont={false}
>
	<label for={name} class="flex w-full flex-col">
		<FormLabel {label} />
		<FormDescription {description} />
		<input
			type={format}
			id={name}
			value={inputValue}
			oninput={(e) => handleInput(e.currentTarget.value)}
			placeholder={m.selectADate()}
			aria-invalid={$errors ? 'true' : undefined}
			class="input validator w-full"
			lang={getLocale()}
			{disabled}
			{...$constraints ?? {}}
			bind:this={nativeDateInput}
		/>
		<input type="hidden" {name} value={submittedValue} {disabled} />
	</label>
</DatePicker>
