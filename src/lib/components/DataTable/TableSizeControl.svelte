<script lang="ts">
	interface Props {
		tableSize: string;
	}

	let { tableSize = $bindable('md') }: Props = $props();
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
	<div class="card-title">Tabellengröße</div>
	<div class="card-body">
		<input
			type="range"
			min="0"
			max="3"
			value="2"
			class="range"
			step="1"
			onchange={(e) => {
				switch (e.target.value) {
					case '0':
						tableSize = 'xs';
						break;
					case '1':
						tableSize = 'sm';
						break;
					case '2':
						tableSize = 'md';
						break;
					case '3':
						tableSize = 'lg';
						break;
					default:
						break;
				}
			}}
		/>
		<div class="flex w-full justify-between px-2 text-xs">
			<i class="fas fa-minus"></i>
			<i class="fas fa-period -translate-y-1"></i>
			<i class="fas fa-period -translate-y-1"></i>
			<i class="fas fa-plus"></i>
		</div>
	</div>
</div>
