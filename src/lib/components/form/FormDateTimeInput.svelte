<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, Date | undefined> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		formFieldProxy
	} from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { isMobileOrTablet } from '$lib/utils/detectMobile';
	import { onMount } from 'svelte';
	import FormDescription from './FormDescription.svelte';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { dateToInputValue, inputValueToDate } from '$lib/helpers/dateTimeInput';

	// Dates and Date pickers in JS are a mess. I tried around a lot of things with this
	// but all of non native inputs break acceissibility. According to this suggestion
	// hiding the native input and displaying a formatted string is the best solution:
	// https://stackoverflow.com/a/31162426/11988368

	interface Props {
		name: N;
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
	const { value: field, constraints } = formFieldProxy<A, N, DateField>(form, name);
	let nativeDateInput = $state<HTMLInputElement>();

	/** The value currently held by the form store, as a valid Date or undefined. */
	let currentDate = $derived.by(() => {
		const value = $field;
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
		return value;
	});

	let inputValue = $derived(dateToInputValue(currentDate, enableTime));

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
	<Field {form} {name}>
		<div class="flex w-full flex-col">
			<Control>
				{#snippet children({ props })}
					{#if label}
						<Label class="label mb-2 whitespace-break-spaces">{label}</Label>
					{/if}
					<FormDescription {description} />
					<input
						{...props}
						type={format}
						value={inputValue}
						oninput={(e) => handleInput(e.currentTarget.value)}
						placeholder={m.selectADate()}
						class="input validator w-full"
						lang={getLocale()}
						{disabled}
						{...$constraints ?? {}}
						bind:this={nativeDateInput}
					/>
				{/snippet}
			</Control>
			<FormFieldErrors />
		</div>
	</Field>
</DatePicker>
