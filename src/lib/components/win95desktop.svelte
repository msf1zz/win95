<script lang="ts">
	import { onMount } from 'svelte';
	import { win95registry, type win95appid } from '$lib/win95/registry';
	import Stickfight from '$lib/win95/apps/stickfight.svelte';
	import { iconfor } from '$lib/win95/icons';
	import Win95window from '$lib/components/win95window.svelte';
	import type { Component } from 'svelte';
	import { fitDesktopWindow, measureDesktopArea } from '$lib/win95/desktop-bounds';
	import '$lib/win95/win95.css';
	import '$lib/win95/shell.css';

	type desktopitem = {
		id: string;
		label: string;
		appId?: win95appid;
		kind: 'app' | 'readme';
		col: number;
		row: number;
		w: number;
		h: number;
	};

	type openwin = {
		id: string;
		title: string;
		appId?: win95appid;
		kind: 'app' | 'readme';
		x: number;
		y: number;
		w: number;
		h: number;
		z: number;
	};

	const items: desktopitem[] = [
		{ id: 'mycomputer', label: 'My Computer', appId: 'about', kind: 'app', col: 0, row: 0, w: 400, h: 320 },
		{ id: 'network', label: 'Network Neighborhood', kind: 'readme', col: 0, row: 1, w: 420, h: 300 },
		{ id: 'recycle', label: 'Recycle Bin', appId: 'recyclebin', kind: 'app', col: 0, row: 2, w: 360, h: 280 },
		{ id: 'stickfight', label: 'Stick Fighter', appId: 'stickfight', kind: 'app', col: 1, row: 0, w: 580, h: 420 },
		{ id: 'minesweeper', label: 'Minesweeper', appId: 'minesweeper', kind: 'app', col: 1, row: 1, w: 250, h: 330 },
		{ id: 'pong', label: 'Pong', appId: 'pong', kind: 'app', col: 1, row: 2, w: 540, h: 380 },
		{ id: 'paint', label: 'Paint', appId: 'paint', kind: 'app', col: 2, row: 0, w: 660, h: 500 },
		{ id: 'calculator', label: 'Calculator', appId: 'calculator', kind: 'app', col: 2, row: 1, w: 250, h: 310 },
		{ id: 'notepad', label: 'Notepad', appId: 'notepad', kind: 'app', col: 2, row: 2, w: 420, h: 340 }
	];

	const games = items.filter((i) => ['stickfight', 'minesweeper', 'pong'].includes(i.id));
	const accessories = items.filter((i) => ['paint', 'calculator', 'notepad'].includes(i.id));

	let windows = $state<openwin[]>([]);
	let ztop = $state(2);
	let startopen = $state(false);
	let submenu = $state<'programs' | 'games' | 'accessories' | null>(null);
	let selected = $state<string | null>(null);
	let clock = $state('');
	let datestr = $state('');
	let runopen = $state(false);
	let runtext = $state('');
	let toast = $state('');
	let booted = $state(false);
	let readmeBody = $state(`WINDOWS 95 WEB DESKTOP

Double-click a desktop icon to open a program.

Games
  - Stick Fighter
  - Minesweeper
  - Pong

Accessories
  - Paint
  - Calculator
  - Notepad

You can also launch programs from the Start menu or Run dialog.`);
	let desktopEl: HTMLDivElement;
	let taskbarEl: HTMLDivElement;

	const COL_W = 108;
	const ROW_H = 100;
	const ICON_PAD = 20;
	const WIN_PAD = 8;

	function isCoarsePointer() {
		return typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches;
	}

	function fitWindow(w: number, h: number, offset: number) {
		const area = measureDesktopArea(desktopEl, taskbarEl);
		return fitDesktopWindow(area, w, h, offset, WIN_PAD);
	}

	function onIconClick(item: desktopitem, ev: MouseEvent) {
		ev.stopPropagation();
		if (isCoarsePointer()) {
			openitem(item);
			return;
		}
		selected = item.id;
	}

	function tickclock() {
		const now = new Date();
		clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		datestr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function showtoast(msg: string) {
		toast = msg;
		setTimeout(() => {
			if (toast === msg) toast = '';
		}, 2400);
	}

	function wintitle(item: desktopitem) {
		if (item.id === 'mycomputer') return 'About Windows';
		if (item.id === 'recycle') return 'Recycle Bin';
		return `${item.label}.exe`;
	}

	function openitem(item: desktopitem) {
		if (item.kind === 'readme') {
			openreadme();
			return;
		}
		if (!item.appId) return;

		const existing = windows.find((w) => w.id === item.id);
		if (existing) {
			focuswin(item.id);
			return;
		}

		const offset = windows.length * 18;
		const bounds = fitWindow(item.w, item.h, offset);
		windows = [
			...windows,
			{
				id: item.id,
				title: wintitle(item),
				appId: item.appId,
				kind: 'app',
				x: bounds.x,
				y: bounds.y,
				w: bounds.w,
				h: bounds.h,
				z: ++ztop
			}
		];
	}

	function openreadme() {
		const id = 'readme';
		if (windows.find((w) => w.id === id)) {
			focuswin(id);
			return;
		}
		const offset = windows.length * 16;
		const bounds = fitWindow(440, 320, offset);
		windows = [
			...windows,
			{
				id,
				title: 'README.TXT — Notepad',
				kind: 'readme',
				x: bounds.x,
				y: bounds.y,
				w: bounds.w,
				h: bounds.h,
				z: ++ztop
			}
		];
	}

	function focuswin(id: string) {
		ztop += 1;
		windows = windows.map((w) => (w.id === id ? { ...w, z: ztop } : w));
	}

	function closewin(id: string) {
		windows = windows.filter((w) => w.id !== id);
	}

	function showdesktop() {
		ztop += 1;
		windows = windows.map((w) => ({ ...w, z: 0 }));
		selected = null;
	}

	function togglestart() {
		startopen = !startopen;
		if (!startopen) submenu = null;
	}

	function shutdown() {
		startopen = false;
		showtoast('It is now safe to turn off your computer.');
	}

	function runcommand() {
		const raw = runtext.trim();
		const cmd = raw.toLowerCase();
		runopen = false;
		runtext = '';
		const map: Record<string, string> = {
			stickfight: 'stickfight',
			'stick fighter': 'stickfight',
			paint: 'paint',
			pong: 'pong',
			minesweeper: 'minesweeper',
			calc: 'calculator',
			calculator: 'calculator',
			notepad: 'notepad',
			help: 'mycomputer',
			about: 'mycomputer'
		};
		const id = map[cmd];
		const item = items.find((i) => i.id === id);
		if (item) openitem(item);
		else showtoast(`Windows cannot find '${raw}'. Make sure you typed the name correctly.`);
	}

	function AppView(appId: win95appid): Component {
		return win95registry[appId];
	}

	onMount(() => {
		tickclock();
		const timer = setInterval(tickclock, 10_000);
		requestAnimationFrame(() => {
			booted = true;
		});
		return () => clearInterval(timer);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="win95" class:booted onclick={() => { startopen = false; submenu = null; }}>
	<div class="wallpaper" aria-hidden="true"></div>

	<div class="desktop" bind:this={desktopEl}>
		<div class="watermark" aria-hidden="true">
			<span class="wm-title">Windows 95</span>
			<span class="wm-sub">web desktop</span>
		</div>

		<div class="icon-grid">
			{#each items as item}
				<button
					type="button"
					class="icon"
					class:selected={selected === item.id}
					style:left="{ICON_PAD + item.col * COL_W}px; top:{item.row * ROW_H}px"
					onclick={(e) => onIconClick(item, e)}
					ondblclick={(e) => {
						e.stopPropagation();
						openitem(item);
					}}
				>
					<span class="glyph-wrap">
						<img class="glyph" src={iconfor(item.id)} alt="" width="48" height="48" draggable="false" />
					</span>
					<span class="caption">{item.label}</span>
				</button>
			{/each}
		</div>

		{#each windows as win (win.id)}
			{@const App = win.appId ? AppView(win.appId) : null}
			<Win95window
				title={win.title}
				iconId={win.id}
				x={win.x}
				y={win.y}
				width={win.w}
				height={win.h}
				z={win.z}
				active={win.z === ztop}
				onclose={() => closewin(win.id)}
				onfocus={() => focuswin(win.id)}
			>
				{#if win.kind === 'readme'}
					<pre class="readme">{readmeBody}</pre>
				{:else if win.appId === 'stickfight'}
					<Stickfight onclose={() => closewin(win.id)} />
				{:else if App}
					<App />
				{/if}
			</Win95window>
		{/each}

		{#if toast}
			<div class="toast w95-raised" role="status">
				<img src={iconfor('help')} alt="" width="16" height="16" />
				{toast}
			</div>
		{/if}
	</div>

	<div class="taskbar" bind:this={taskbarEl} role="toolbar" aria-label="Taskbar" tabindex="0" onclick={(e) => e.stopPropagation()}>
		<button type="button" class="start w95-raised" class:pressed={startopen} onclick={togglestart}>
			<span class="start-flag" aria-hidden="true"></span>
			<span class="start-label">Start</span>
		</button>

		<div class="task-channel w95-inset">
			<div class="task-buttons">
				{#each windows as win (win.id)}
					<button
						type="button"
						class="task-btn w95-raised"
						class:pressed={win.z === ztop}
						onclick={() => focuswin(win.id)}
					>
						<img src={iconfor(win.id)} alt="" width="16" height="16" />
						<span>{win.title}</span>
					</button>
				{/each}
			</div>
		</div>

		<button type="button" class="desk-btn w95-raised" title="Show desktop" onclick={showdesktop}>
			<span></span>
		</button>

		<div class="tray w95-inset">
			<button type="button" class="tray-btn" title="Volume">🔊</button>
			<button type="button" class="tray-btn" title="Network">🌐</button>
			<div class="clock-box">
				<time class="clock">{clock}</time>
				<span class="date">{datestr}</span>
			</div>
		</div>

		{#if startopen}
			<div class="start-menu">
				<div class="banner">
					<span class="banner-flag" aria-hidden="true"></span>
					<div class="banner-text">
						<span class="banner-ms">Microsoft</span>
						<span class="banner-ver">Windows 95</span>
					</div>
				</div>
				<div class="menu-col">
					<div class="menu-item has-sub" onmouseenter={() => (submenu = 'programs')}>
						<img class="mi-ico" src={iconfor('programs')} alt="" width="16" height="16" />
						Programs
						<span class="arrow">▸</span>
						{#if submenu === 'programs' || submenu === 'games' || submenu === 'accessories'}
							<div class="submenu l1">
								<div class="menu-item has-sub" onmouseenter={() => (submenu = 'games')}>
									<img class="mi-ico" src={iconfor('stickfight')} alt="" width="16" height="16" />
									Games
									<span class="arrow">▸</span>
									{#if submenu === 'games'}
										<div class="submenu l2">
											{#each games as g}
												<button type="button" class="menu-item" onclick={() => { openitem(g); startopen = false; submenu = null; }}>
													<img class="mi-ico" src={iconfor(g.id)} alt="" width="16" height="16" />
													{g.label}
												</button>
											{/each}
										</div>
									{/if}
								</div>
								<div class="menu-item has-sub" onmouseenter={() => (submenu = 'accessories')}>
									<img class="mi-ico" src={iconfor('paint')} alt="" width="16" height="16" />
									Accessories
									<span class="arrow">▸</span>
									{#if submenu === 'accessories'}
										<div class="submenu l2">
											{#each accessories as a}
												<button type="button" class="menu-item" onclick={() => { openitem(a); startopen = false; submenu = null; }}>
													<img class="mi-ico" src={iconfor(a.id)} alt="" width="16" height="16" />
													{a.label}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<button type="button" class="menu-item" onclick={() => { openreadme(); startopen = false; }}>
						<img class="mi-ico" src={iconfor('readme')} alt="" width="16" height="16" />
						Documents
					</button>
					<button type="button" class="menu-item" onclick={() => { openitem(items[0]); startopen = false; }}>
						<img class="mi-ico" src={iconfor('settings')} alt="" width="16" height="16" />
						Settings
					</button>
					<button type="button" class="menu-item" onclick={() => showtoast('Find: try the desktop icons instead ♡')}>
						<img class="mi-ico" src={iconfor('find')} alt="" width="16" height="16" />
						Find…
					</button>
					<button type="button" class="menu-item" onclick={() => { openitem(items[0]); startopen = false; }}>
						<img class="mi-ico" src={iconfor('help')} alt="" width="16" height="16" />
						Help
					</button>
					<button type="button" class="menu-item" onclick={() => { runopen = true; startopen = false; }}>
						<img class="mi-ico" src={iconfor('run')} alt="" width="16" height="16" />
						Run…
					</button>
					<hr />
					<button type="button" class="menu-item shutdown" onclick={shutdown}>
						<img class="mi-ico" src={iconfor('shutdown')} alt="" width="16" height="16" />
						Shut Down…
					</button>
				</div>
				<div class="menu-status">{items.length} object(s)</div>
			</div>
		{/if}
	</div>

	{#if runopen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="run-overlay" onclick={() => (runopen = false)}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="run-dialog" onclick={(e) => e.stopPropagation()}>
				<div class="run-titlebar">
					<img src={iconfor('run')} alt="" width="16" height="16" />
					<span>Run</span>
					<button type="button" class="run-close" aria-label="Close" onclick={() => (runopen = false)}>×</button>
				</div>
				<div class="run-body">
					<p class="run-lead">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
					<label>
						Open:
						<input bind:value={runtext} placeholder="stickfight" onkeydown={(e) => e.key === 'Enter' && runcommand()} />
					</label>
					<div class="run-actions">
						<button type="button" class="w95-btn w95-raised" onclick={runcommand}>OK</button>
						<button type="button" class="w95-btn w95-raised" onclick={() => (runopen = false)}>Cancel</button>
						<button type="button" class="w95-btn w95-raised" onclick={() => showtoast('Help: type paint, pong, stickfight…')}>Browse…</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.win95 {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		font-family: 'Tahoma', 'MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		color: #000;
		opacity: 0;
		transition: opacity 0.35s ease;
	}

	.win95.booted {
		opacity: 1;
	}

	.wallpaper {
		position: absolute;
		inset: 0;
		background: #071833 url('/win95.webp') center / cover no-repeat;
		image-rendering: pixelated;
	}

	.desktop {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		z-index: 1;
	}

	.watermark {
		position: absolute;
		right: 20px;
		bottom: 16px;
		text-align: right;
		pointer-events: none;
		color: rgba(255, 255, 255, 0.72);
		text-shadow: 1px 1px 2px rgba(0, 40, 0, 0.45);
	}

	.wm-title {
		display: block;
		font: bold 22px Tahoma, sans-serif;
		letter-spacing: 0.04em;
	}

	.wm-sub {
		display: block;
		font: 11px Tahoma, sans-serif;
		opacity: 0.85;
	}

	.icon-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	@media (min-width: 1024px) {
		.icon-grid {
			top: 50%;
			bottom: auto;
			height: 300px;
			transform: translateY(-50%);
		}
	}

	.icon-grid .icon {
		pointer-events: auto;
	}

	.icon {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		width: 88px;
		padding: 4px 2px 6px;
		border: 1px solid transparent;
		background: transparent;
		color: #fff;
		cursor: default;
	}

	.icon:hover .caption,
	.icon.selected .caption {
		background: #000080;
		color: #fff;
	}

	.icon.selected {
		border: 1px dotted #000;
		background: rgba(0, 0, 128, 0.18);
	}

	.glyph-wrap {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
	}

	.glyph {
		width: 48px;
		height: 48px;
		image-rendering: pixelated;
		filter: drop-shadow(1px 2px 1px rgba(0, 0, 0, 0.45));
	}

	.caption {
		font-size: 11px;
		line-height: 1.2;
		text-align: center;
		max-width: 84px;
		word-break: break-word;
		padding: 1px 3px;
		text-shadow: 1px 1px 1px #000;
	}

	.readme {
		margin: 0;
		padding: 8px 10px;
		line-height: 1.4;
		background: #fff;
		color: #000;
		height: 100%;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
		font-family: 'Lucida Console', 'Courier New', monospace;
		font-size: 11px;
		white-space: pre-wrap;
		word-break: break-word;
		border: none;
	}

	.toast {
		position: absolute;
		left: 50%;
		bottom: 12px;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: #ffffe1;
		font-size: 11px;
		z-index: 60;
		max-width: calc(100% - 24px);
	}

	.taskbar {
		position: relative;
		z-index: 55;
		display: flex;
		align-items: center;
		gap: 3px;
		height: 32px;
		padding: 3px 4px;
		background: #c0c0c0;
		border-top: 2px solid #dfdfdf;
		box-shadow: inset 0 1px #fff;
		flex-shrink: 0;
	}

	.start {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 26px;
		padding: 0 12px 0 5px;
		border: none;
		font-weight: 700;
		font-size: 11px;
		cursor: default;
		flex-shrink: 0;
	}

	.start.pressed {
		box-shadow:
			inset -1px -1px #fff,
			inset 1px 1px #0a0a0a,
			inset -2px -2px #dfdfdf,
			inset 2px 2px #808080;
	}

	.start-flag {
		display: inline-block;
		width: 18px;
		height: 16px;
		background:
			linear-gradient(135deg, #f00 0 50%, transparent 50%),
			linear-gradient(225deg, #0a0 0 50%, transparent 50%),
			linear-gradient(45deg, #00f 0 50%, transparent 50%),
			linear-gradient(315deg, #ff0 0 50%, transparent 50%);
		background-size: 50% 50%;
		background-position: top left, top right, bottom left, bottom right;
		background-repeat: no-repeat;
		border: 1px solid #000;
	}

	.task-channel {
		flex: 1;
		min-width: 0;
		height: 26px;
		padding: 2px 3px;
		display: flex;
		align-items: center;
	}

	.task-buttons {
		display: flex;
		gap: 3px;
		overflow-x: auto;
		width: 100%;
	}

	.task-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		max-width: 160px;
		height: 22px;
		padding: 0 8px 0 5px;
		border: none;
		background: #c0c0c0;
		font: inherit;
		font-size: 11px;
		cursor: default;
		flex-shrink: 0;
	}

	.task-btn img {
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.task-btn span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.task-btn.pressed {
		box-shadow:
			inset -1px -1px #fff,
			inset 1px 1px #0a0a0a,
			inset -2px -2px #dfdfdf,
			inset 2px 2px #808080;
		font-weight: 700;
	}

	.desk-btn {
		width: 22px;
		height: 26px;
		padding: 0;
		border: none;
		flex-shrink: 0;
		display: grid;
		place-items: center;
	}

	.desk-btn span {
		display: block;
		width: 14px;
		height: 12px;
		background: linear-gradient(180deg, #4a90d9 30%, #2d6cb5 30% 60%, #7ec850 60%);
		border: 1px solid #000;
	}

	.tray {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		height: 26px;
		flex-shrink: 0;
	}

	.tray-btn {
		border: none;
		background: transparent;
		font-size: 12px;
		line-height: 1;
		padding: 2px;
		cursor: default;
	}

	.clock-box {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding-left: 6px;
		border-left: 1px solid #808080;
		margin-left: 2px;
		line-height: 1.15;
	}

	.clock {
		font-size: 11px;
		font-weight: 700;
	}

	.date {
		font-size: 9px;
		color: #404040;
	}

	.start-menu {
		position: absolute;
		left: 4px;
		bottom: 34px;
		display: flex;
		flex-direction: column;
		width: min(300px, 92vw);
		border: 2px solid #fff;
		outline: 1px solid #000;
		background: #c0c0c0;
		box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
	}

	.banner {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 14px 12px 16px;
		background: linear-gradient(180deg, #000080 0%, #1084d0 55%, #000080 100%);
		color: #fff;
	}

	.banner-flag {
		width: 32px;
		height: 28px;
		flex-shrink: 0;
		background:
			linear-gradient(135deg, #f00 0 50%, transparent 50%),
			linear-gradient(225deg, #0a0 0 50%, transparent 50%),
			linear-gradient(45deg, #00f 0 50%, transparent 50%),
			linear-gradient(315deg, #ff0 0 50%, transparent 50%);
		background-size: 50% 50%;
		background-position: top left, top right, bottom left, bottom right;
		background-repeat: no-repeat;
		border: 1px solid #fff;
	}

	.banner-text {
		display: flex;
		flex-direction: column;
		line-height: 1.05;
	}

	.banner-ms {
		font: italic 700 18px 'Times New Roman', serif;
	}

	.banner-ver {
		font: 400 26px 'Times New Roman', serif;
	}

	.menu-col {
		padding: 4px 0;
		position: relative;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 7px 14px 7px 10px;
		border: none;
		background: transparent;
		text-align: left;
		font: inherit;
		font-size: 11px;
		cursor: default;
		position: relative;
		color: #000;
	}

	.menu-item:hover,
	.has-sub:hover {
		background: #000080;
		color: #fff;
	}

	.has-sub .arrow {
		margin-left: auto;
		font-size: 10px;
	}

	.mi-ico {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.menu-col hr {
		margin: 6px 12px;
		border: none;
		border-top: 1px solid #808080;
		box-shadow: 0 1px #fff;
	}

	.shutdown {
		font-weight: 700;
	}

	.menu-status {
		padding: 4px 12px 6px;
		border-top: 1px solid #808080;
		box-shadow: inset 0 1px #fff;
		font-size: 10px;
		color: #404040;
	}

	.submenu {
		position: absolute;
		left: 100%;
		top: 0;
		min-width: 190px;
		background: #c0c0c0;
		border: 2px solid #fff;
		outline: 1px solid #000;
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
		padding: 3px 0;
		z-index: 5;
	}

	.submenu.l1 { top: 4px; }
	.submenu.l2 { top: 0; }

	.run-overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 80, 0.18);
	}

	.run-dialog {
		width: min(400px, 94vw);
		background: #c0c0c0;
		border: 2px solid #fff;
		outline: 1px solid #000;
		box-shadow: 4px 4px 0 #000;
	}

	.run-titlebar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 4px;
		background: linear-gradient(90deg, #000080, #1084d0);
		color: #fff;
		font-weight: 700;
	}

	.run-titlebar img {
		image-rendering: pixelated;
	}

	.run-titlebar span {
		flex: 1;
	}

	.run-close {
		width: 18px;
		height: 16px;
		border: none;
		background: #c0c0c0;
		color: #000;
		font-size: 14px;
		line-height: 1;
		box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff;
	}

	.run-body {
		padding: 14px 12px 12px;
	}

	.run-lead {
		margin: 0 0 12px;
		font-size: 11px;
		line-height: 1.4;
	}

	.run-body label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
	}

	.run-body input {
		flex: 1;
		padding: 4px 5px;
		border: 2px solid;
		border-color: #808080 #fff #fff #808080;
		font: inherit;
	}

	.run-actions {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
		margin-top: 16px;
	}

	.run-actions .w95-btn {
		min-width: 76px;
		height: 26px;
		border: none;
		font: inherit;
		font-size: 11px;
	}

	@media (max-width: 1023px) {
		.desktop {
			overflow-y: auto;
			overflow-x: hidden;
			-webkit-overflow-scrolling: touch;
		}

		.icon-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
			align-content: safe center;
			gap: 2px 4px;
			padding: 12px 8px;
			max-width: 100%;
			height: auto;
			transform: none;
		}

		.icon {
			position: relative;
			left: auto !important;
			top: auto !important;
			width: auto;
			min-height: 84px;
		}

		.watermark {
			display: none;
		}

		.start {
			min-height: 32px;
			padding: 0 10px 0 6px;
		}

		.task-btn {
			max-width: 120px;
			min-height: 28px;
		}

		.tray-btn {
			min-width: 28px;
			min-height: 28px;
		}

		.desk-btn {
			width: 28px;
			min-height: 32px;
		}

		.start-menu .menu-item {
			min-height: 36px;
			padding-top: 9px;
			padding-bottom: 9px;
		}

		.submenu {
			position: static;
			left: auto;
			top: auto;
			min-width: 0;
			width: 100%;
			box-shadow: none;
			border: none;
			outline: none;
			padding-left: 12px;
			background: #b8b8b8;
		}

		.submenu.l1,
		.submenu.l2 {
			top: auto;
		}

		.has-sub .arrow {
			transform: rotate(90deg);
		}

		.run-actions {
			flex-wrap: wrap;
		}

		.run-actions .w95-btn {
			min-width: 64px;
			min-height: 36px;
		}
	}

	@media (max-width: 767px) {
		.taskbar {
			height: auto;
			min-height: 36px;
			flex-wrap: wrap;
			padding-bottom: 4px;
		}

		.task-channel {
			order: 3;
			flex: 1 1 100%;
			height: auto;
			min-height: 28px;
		}

		.clock-box .date {
			display: none;
		}

		.start-menu {
			width: min(300px, calc(100vw - 8px));
			max-height: calc(100dvh - 48px);
			overflow-y: auto;
		}

		.banner-ms {
			font-size: 16px;
		}

		.banner-ver {
			font-size: 22px;
		}

		.toast {
			width: min(340px, calc(100vw - 24px));
			font-size: 10px;
			bottom: 8px;
		}
	}
</style>
