<script lang="ts">
	import graphqlIcon from '$assets/graphqlIcon.svg';
</script>

<div class="fab">
	<div tabindex="0" role="button" class="btn btn-lg btn-circle btn-primary">
		<i class="fas fa-tools"></i>
	</div>

	<!-- buttons that show up when FAB is open -->
	<a
		class="btn btn-lg btn-circle"
		href="/api/graphql"
		aria-label="GraphQL Playground"
		title="GraphQL Playground"
		target="_blank"
	>
		<img src={graphqlIcon} alt="GraphQL" class="h-6 w-6" />
	</a>
</div>
