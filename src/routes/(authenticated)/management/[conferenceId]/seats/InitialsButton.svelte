<script lang="ts">
	import formatNames, { formatInitials } from '$lib/services/formatNames';

	interface Props {
		given_name: string;
		family_name: string;
		href: string;
	}

	let { given_name, family_name, href }: Props = $props();
</script>

<div class="tooltip" data-tip={formatNames(given_name, family_name)}>
	<a class="btn btn-sm font-mono w-10" {href}>
		{formatInitials(given_name, family_name)}
	</a>
</div>
