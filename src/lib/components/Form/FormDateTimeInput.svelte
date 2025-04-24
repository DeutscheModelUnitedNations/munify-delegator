<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm, dateProxy } from 'sveltekit-superforms';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { isMobileOrTablet } from '$lib/services/detectMobile';
	import { onMount } from 'svelte';

	// Dates and Date pickers in JS are a mess. I tried around a lot of things with this
	// but all of non native inputs break acceissibility. According to this suggestion
	// hiding the native input and displaying a formatted string is the best solution:
	// https://stackoverflow.com/a/31162426/11988368

	interface Props {
		name: string;
		label?: string;
		form: SuperForm<A, B>;
		enableTime?: boolean;
		showYearControls?: boolean;
		enableFutureDates?: boolean;
		enablePastDates?: boolean;
		defaultYear?: number;
		isMultipane?: boolean;
	}

	let {
		form,
		label,
		name,
		showYearControls = true,
		enableTime = false,
		enableFutureDates = true,
		enablePastDates = true,
		defaultYear = new Date().getFullYear(),
		isMultipane = false
	}: Props = $props();

	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let format: 'datetime-local' | 'date' = enableTime ? 'datetime-local' : 'date';

	let isNonNativeDatepickerOpen = $state(false);

	const proxyDate = dateProxy(form, name as any, { format });
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);
	let nativeDateInput = $state<HTMLInputElement>();
	let localizedDateString = $derived.by(() => {
		if (!$proxyDate) return m.selectADate();
		const date = new Date($proxyDate);
		if (enableTime) {
			return date.toLocaleDateString(getLocale(), {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			});
		} else {
			return date.toLocaleDateString(getLocale(), {
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

	function nonNativeDatePickEvent(e: any) {
		const newDate = new Date(e.startDate);
		if (enableTime) {
			const timeNumbers = e.startDateTime.split(':').map(Number) as number[];
			newDate.setHours(
				timeNumbers.at(0) ?? 0,
				timeNumbers.at(1) ?? 0,
				timeNumbers.at(2) ?? 0,
				timeNumbers.at(3) ?? 0
			);
		}

		proxyDate.set(newDate.toISOString());
	}
</script>

<DatePicker
	onDayClick={nonNativeDatePickEvent}
	startDate={new Date($proxyDate)}
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
	<label class="form-control w-full" for={name}>
		{label}
		<div class="relative">
			<input
				{name}
				type={format}
				id={name}
				bind:value={$proxyDate}
				placeholder={m.selectADate()}
				aria-invalid={errors ? 'true' : undefined}
				class="input input-bordered w-full"
				lang={getLocale()}
				{...constraints}
				bind:this={nativeDateInput}
			/>
			<div
				aria-hidden={true}
				onclick={open}
				onkeydown={open}
				class="input input-bordered absolute right-1/2 top-1/2 flex w-full -translate-y-1/2 translate-x-1/2 cursor-pointer items-center"
			>
				{localizedDateString}
			</div>
			<i class="fa-duotone fa-calendar absolute right-4 top-1/2 -translate-y-1/2 text-lg"></i>
		</div>
	</label>
</DatePicker>
