<script lang="ts">
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { format } from 'date-fns';
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

	$inspect(pickedDate);
</script>

<DatePicker
	bind:isOpen
	startDate={pickedDate}
	enableFutureDates
	enablePastDates={false}
	onDayClick={(e) => setPickedDate(new Date(e.startDate))}
	includeFont={false}
	showTimePicker={includeTime}
>
	<label class="form-control w-full">
		<span class="label-text">{label}</span>
		<input
			type="text"
			placeholder={m.selectADate()}
			value={pickedDate ? formatDate(pickedDate) : ''}
			onclick={toggleDatePicker}
			class="input input-bordered {initialDate &&
				pickedDate &&
				format(initialDate, 'yyyyMMdd') !== format(pickedDate, 'yyyyMMdd') &&
				'input-success border-4'}"
		/>
	</label>
</DatePicker>
