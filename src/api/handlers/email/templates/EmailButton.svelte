<script lang="ts">
	import { Button } from '@better-svelte-email/components';
	import { brand } from './brand';

	/**
	 * The one call to action of a mail, in the primary colour with the CI's near-square corners.
	 * The library's button pads the link in a way Outlook keeps, so the whole box is clickable there
	 * too; the cell behind it carries the colour for clients that drop the link's background.
	 */
	let { href, label }: { href: string; label: string } = $props();
</script>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
	<tbody>
		<tr>
			<td style="background-color: {brand.primary}; border-radius: {brand.radius};">
				<Button
					{href}
					pX={28}
					pY={14}
					style="background-color: {brand.primary}; font-family: {brand.font}; font-size: 16px; font-weight: 700; color: {brand.primaryContent}; border-radius: {brand.radius};"
				>
					{label}
				</Button>
			</td>
		</tr>
	</tbody>
</table>
