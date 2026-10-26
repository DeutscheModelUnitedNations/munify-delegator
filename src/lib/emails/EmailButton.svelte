<script lang="ts">
	import { brand } from './brand';

	/** The one call to action of a mail, in the primary colour with the CI's near-square corners. */
	let { href, label }: { href: string; label: string } = $props();
</script>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
	<tbody>
		<tr>
			<td style="background-color: {brand.primary}; border-radius: 2px;">
				<a
					{href}
					style="display: inline-block; padding: 14px 28px; font-family: {brand.font}; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 2px;"
				>
					{label}
				</a>
			</td>
		</tr>
	</tbody>
</table>
