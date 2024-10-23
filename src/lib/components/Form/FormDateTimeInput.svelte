<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { languageTag } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';

	//TODO we should consider using native date inputs on mobile devices

	interface Props {
		name: string;
		endName?: string;
		label?: string;
		form: SuperForm<A, B>;
		isRange?: boolean;
		isMultipane?: boolean;
		showYearControls?: boolean;
		showTimePicker?: boolean;
		enableFutureDates?: boolean;
		enablePastDates?: boolean;
		defaultYear?: number;
	}

	let {
		form,
		label,
		name,
		endName,
		isRange = false,
		isMultipane = false,
		showYearControls = true,
		showTimePicker = false,
		enableFutureDates = true,
		enablePastDates = true,
		defaultYear = new Date().getFullYear()
	}: Props = $props();

	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let isOpen = $state(false);

	const stringifyDate = (input: Date) => {
		return new Date(input).toLocaleDateString(languageTag());
	};

	let startDate = $state<Date>($formData[name] as Date);
	let startDateString = $state<string>(stringifyDate($formData[name] as Date));
	let startErrors = $derived(($formErrors as any)[name] ?? []);
	let startConstraints = $derived(($formConstraints as any)[name]);

	let endDate = $state<Date>(endName ? ($formData[endName] as Date) : new Date());
	let endDateString = $state<string>(endName ? stringifyDate($formData[endName] as Date) : '');
	let endErrors = $derived((endName ? ($formErrors as any)[endName] : []) ?? []);
	let endConstraints = $derived(endName ? ($formConstraints as any)[endName] : []);

	const alignDatesFromString = () => {
		startDate = new Date(startDateString);
		// @ts-ignore
		$formData[name] = startDate;

		if (endName) {
			endDate = new Date(endDateString);
			// @ts-ignore
			$formData[endName] = endDate;
		}
	};

	const alignDatesFromDatepicker = (e: any) => {
		const eventStartDate = new Date(e.startDate);
		const eventStartDateTime = e.startDateTime;

		const composedEventStartDate = new Date(
			eventStartDate.getFullYear(),
			eventStartDate.getMonth(),
			eventStartDate.getDate(),
			...eventStartDateTime.split(':').map(Number)
		);

		startDate = composedEventStartDate;
		startDateString = stringifyDate(startDate);
		// @ts-ignore
		$formData[name] = startDate;

		if (endName) {
			const eventEndDate = new Date(e.startDate);
			const eventEndDateTime = e.startDateTime;

			const composedEventEndDate = new Date(
				eventEndDate.getFullYear(),
				eventEndDate.getMonth(),
				eventEndDate.getDate(),
				...eventEndDateTime.split(':').map(Number)
			);

			endDate = composedEventEndDate;
			endDateString = stringifyDate(endDate);
			// @ts-ignore
			$formData[endName] = endDate;
		}
	};

	const toggleOpen = (e: any) => {
		// e?.preventDefault();
		isOpen = !isOpen;
	};
</script>

<span>
	<DatePicker
		{startDate}
		{endDate}
		bind:isOpen
		{enableFutureDates}
		{enablePastDates}
		{showTimePicker}
		{isRange}
		{isMultipane}
		{showYearControls}
		{defaultYear}
		includeFont={false}
		onDayClick={alignDatesFromDatepicker}
	>
		<span class="flex w-full items-center">
			<label class="form-control w-full" for={name}>
				<span class="label-text mb-1">{label}</span>
				<span class="relative">
					<i class="fa-solid fa-calendar absolute right-4 top-1/2 -translate-y-1/2 text-lg"></i>
					<input
						{name}
						id={name}
						type="text"
						placeholder={m.selectADate()}
						class="input input-bordered w-full cursor-pointer"
						aria-label="Start date"
						bind:value={startDateString}
						onchange={alignDatesFromString}
						onclick={toggleOpen}
						aria-invalid={startErrors ? 'true' : undefined}
						lang={languageTag()}
						{...startConstraints}
					/>
				</span>
			</label>
			{#if isRange}
				<span class="mx-3"> {m.until()} </span>
				<label class="form-control w-full" for={name}>
					<span class="label-text">{label}</span>
					<span class="relative">
						<i class="fa-solid fa-calendar absolute right-4 top-1/2 -translate-y-1/2 text-lg"></i>
						<input
							{name}
							id={endName}
							type="text"
							placeholder={m.selectAnEndDate()}
							class="input input-bordered w-full cursor-pointer"
							aria-label="End date"
							bind:value={endDateString}
							onchange={alignDatesFromString}
							onclick={toggleOpen}
							aria-invalid={endErrors ? 'true' : undefined}
							lang={languageTag()}
							{...endConstraints}
						/>
					</span>
				</label>
			{/if}
		</span>
	</DatePicker>
	<FormFieldErrors errors={[...startErrors, ...endErrors]} />
</span>
