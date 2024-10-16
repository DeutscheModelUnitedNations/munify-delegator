<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import Wrapper from './Wrapper.svelte';

	interface Props {
		countryCode: string;
	}

	let { countryCode }: Props = $props();
</script>

<Wrapper className="w-full">
	<div class="stat">
		<div class="stat-figure text-secondary">
			<Flag alpha2Code={countryCode} size="md" />
		</div>
		<div class="stat-title">Sie vertreten</div>
		<div class="stat-value overflow-ellipsis text-wrap text-2xl sm:w-auto sm:text-4xl">
			{countryCodeToLocalName(countryCode)}
		</div>
	</div>
</Wrapper>
