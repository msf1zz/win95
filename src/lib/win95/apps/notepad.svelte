<script lang="ts">
	import '../win95.css';

	let text = $state(`Welcome to Windows 95 Notepad

no bloat
`);
</script>

<div class="w95-app">
	<div class="w95-menubar" role="menubar">
		<button type="button">File</button>
		<button type="button">Edit</button>
		<button type="button">Search</button>
		<button type="button">Help</button>
	</div>
	<textarea class="pad" bind:value={text} spellcheck="false"></textarea>
</div>

<style>
	.pad {
		flex: 1;
		min-height: 0;
		margin: 2px;
		padding: 4px 6px;
		border: none;
		resize: none;
		font-family: 'Lucida Console', 'Courier New', monospace;
		font-size: 12px;
		line-height: 1.35;
		background: #fff;
		color: #000;
		outline: none;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	@media (max-width: 767px) {
		.pad {
			font-size: 16px;
		}
	}
</style>
