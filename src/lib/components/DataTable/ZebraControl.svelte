<script lang="ts">
	interface Props {
		zebra: boolean;
	}

	let { zebra = $bindable(true) }: Props = $props();
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
	<div class="card-title">Zebra</div>
	<div class="card-body">
		<input
			type="checkbox"
			class="toggle"
			checked={zebra}
			onchange={(e) => {
				zebra = e.target.checked;
			}}
		/>
	</div>
</div>
