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
			<Flag {countryCode} size="md" />
		</div>
		<div class="stat-title">Sie vertreten</div>
		<div class="stat-value text-2xl sm:text-4xl sm:w-auto overflow-ellipsis text-wrap">
			{countryCodeToLocalName(countryCode)}
		</div>
	</div>
</Wrapper>
