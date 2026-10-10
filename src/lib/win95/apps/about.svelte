<script lang="ts">
	import '../win95.css';
</script>

<div class="w95-app about">
	<div class="logo-row">
		<div class="flag-box" aria-hidden="true">
			<span class="pane"></span>
			<span class="pane"></span>
			<span class="pane"></span>
			<span class="pane"></span>
		</div>
		<div>
			<p class="title">Microsoft Windows</p>
			<p class="ver">Version 4.00.950 web edition</p>
		</div>
	</div>
	<p class="copy">A browser-based tribute to the classic desktop.</p>
	<p class="body">
		This web desktop includes games and accessories inspired by the Windows 95 era.
	</p>
	<ul>
		<li>Stick Fighter — beat the CPU</li>
		<li>Mine Sweeper — classic grid</li>
		<li>Pong — arcade paddle duel</li>
		<li>Paint — pencil, brush, <strong>eraser</strong></li>
	</ul>
	<div class="ok-row">
		<button type="button" class="w95-btn ok">OK</button>
	</div>
</div>

<style>
	.about {
		padding: 12px 14px;
		background: #c0c0c0;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	.logo-row {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 10px;
	}

	.flag-box {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 46px;
		height: 46px;
		border: 1px solid #000;
	}

	.pane {
		display: block;
	}

	.pane:nth-child(1) { background: #f00; }
	.pane:nth-child(2) { background: #00a000; }
	.pane:nth-child(3) { background: #00f; }
	.pane:nth-child(4) { background: #ff0; }

	.title {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}

	.ver {
		margin: 2px 0 0;
		font-size: 11px;
	}

	.copy,
	.body {
		margin: 0 0 8px;
		font-size: 11px;
		line-height: 1.4;
	}

	ul {
		margin: 0 0 12px;
		padding-left: 18px;
		font-size: 11px;
		line-height: 1.45;
	}

	.ok-row {
		display: flex;
		justify-content: flex-end;
	}

	.ok {
		min-width: 72px;
		height: 26px;
	}

	@media (max-width: 767px) {
		.ok {
			min-width: 88px;
			min-height: 36px;
		}
	}
</style>
