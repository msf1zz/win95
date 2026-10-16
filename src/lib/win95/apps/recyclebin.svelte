<script lang="ts">
	import '../win95.css';

	const items = [
		'broken_route.dll',
		'ERR_SECTOR_NULL.tmp',
		'your_dignity.bak',
		'deleted_shortcut.lnk'
	];
</script>

<div class="w95-app bin">
	<div class="w95-menubar" role="menubar">
		<button type="button">File</button>
		<button type="button">Edit</button>
		<button type="button">View</button>
		<button type="button">Help</button>
	</div>
	<p class="msg">trash.</p>
	<ul>
		{#each items as item}
			<li>
				<span class="ico">📄</span>
				{item}
			</li>
		{/each}
	</ul>
	<p class="hint">wow.</p>
</div>

<style>
	.bin {
		padding: 8px;
		background: #fff;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	.msg {
		margin: 0 0 8px;
		font-weight: 700;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 4px;
		font-size: 11px;
	}

	li:hover {
		background: #000080;
		color: #fff;
	}

	.hint {
		margin: 12px 0 0;
		font-size: 10px;
		color: #404040;
	}
</style>
