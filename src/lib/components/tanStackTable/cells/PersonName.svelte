<script lang="ts">
	interface Props {
		familyName: string | null;
		givenName: string | null;
	}

	let { familyName, givenName }: Props = $props();
</script>

<span class="uppercase">{familyName}</span>
{givenName}
