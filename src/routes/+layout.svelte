<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		margin: 0;
		overflow: hidden;
	}

	:global(button),
	:global(input) {
		font: inherit;
	}
</style>
