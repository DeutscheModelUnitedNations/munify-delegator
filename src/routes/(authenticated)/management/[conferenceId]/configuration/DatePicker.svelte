<script lang="ts">
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { format, parse } from 'date-fns';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		label: string;
		initialDate: Date | undefined;
		pickedDate: Date | undefined;
		setPickedDate: (date: Date) => void;
		includeTime?: boolean;
	}

	let { label, initialDate, pickedDate, setPickedDate, includeTime = false }: Props = $props();

	let isOpen = $state(false);

	const toggleDatePicker = () => (isOpen = !isOpen);

	const formatDate = (dateString: string | Date) => {
		if (includeTime) {
			return (dateString && format(new Date(dateString), 'dd.MM.yyyy HH:mm')) || '';
		}
		return (dateString && format(new Date(dateString), 'dd.MM.yyyy')) || '';
	};
</script>

<DatePicker
	bind:isOpen
	startDate={pickedDate}
	enableFutureDates
	enablePastDates
	onDayClick={(e) => {
		const date = new Date(e.startDate);
		const time = e.startDateTime ?? '00:00';
		setPickedDate(new Date(`${format(date, 'yyyy-MM-dd')}T${time}`));
	}}
	includeFont={false}
	showTimePicker={includeTime}
>
	<label class="form-control w-full">
		<span class="label-text">{label}</span>
		<input
			type="text"
			pattern={includeTime ? '\\d{2}.\\d{2}.\\d{4} \\d{2}:\\d{2}' : '\\d{2}.\\d{2}.\\d{4}'}
			placeholder={m.selectADate()}
			value={pickedDate ? formatDate(pickedDate) : ''}
			onclick={toggleDatePicker}
			onchange={(e) => {
				setPickedDate(
					parse(e.target?.value, includeTime ? 'dd.MM.yyyy HH:mm' : 'dd.MM.yyyy', new Date())
				);
			}}
			class="input input-bordered {initialDate &&
				pickedDate &&
				format(initialDate, 'yyyyMMddHHmm') !== format(pickedDate, 'yyyyMMddHHmm') &&
				'input-success border-4'}"
		/>
	</label>
</DatePicker>
