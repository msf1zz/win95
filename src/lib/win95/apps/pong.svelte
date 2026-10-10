<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

	let canvas: HTMLCanvasElement;
	let p1score = $state(0);
	let p2score = $state(0);
	let status = $state('W/S or swipe ↑↓ · first to 7 wins');
	let paddleUp = $state(false);
	let paddleDown = $state(false);

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		const keys = new Set<string>();
		let w = 0;
		let h = 0;
		let raf = 0;
		let swipePaddle: 'up' | 'down' | null = null;

		const paddle = { h: 64, w: 10 };
		let left = { y: 0, vy: 0 };
		let right = { y: 0, vy: 0 };
		let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7 };
		let serving = 1;

		function resetBall(dir = serving) {
			ball.x = w / 2;
			ball.y = h / 2;
			ball.vx = dir * 4.2;
			ball.vy = (Math.random() - 0.5) * 3;
		}

		function resetMatch() {
			p1score = p2score = 0;
			status = 'W/S or swipe ↑↓ · first to 7 wins';
			resetBall();
		}

		function resize() {
			const rect = canvas.getBoundingClientRect();
			w = Math.max(300, rect.width);
			h = Math.max(180, rect.height);
			canvas.width = w;
			canvas.height = h;
			left.y = right.y = h / 2 - paddle.h / 2;
			resetBall();
		}

		function movePaddle(dir: 'up' | 'down', px = 36) {
			if (dir === 'up') left.y = Math.max(8, left.y - px);
			else left.y = Math.min(h - paddle.h - 8, left.y + px);
		}

		function step() {
			if (swipePaddle === 'up' || paddleUp || keys.has('w')) left.vy = -5;
			else if (swipePaddle === 'down' || paddleDown || keys.has('s')) left.vy = 5;
			else left.vy = 0;

			const target = ball.y - paddle.h / 2;
			right.vy = Math.max(-4.5, Math.min(4.5, (target - right.y) * 0.12));

			left.y = Math.max(8, Math.min(h - paddle.h - 8, left.y + left.vy));
			right.y = Math.max(8, Math.min(h - paddle.h - 8, right.y + right.vy));

			ball.x += ball.vx;
			ball.y += ball.vy;

			if (ball.y - ball.r < 0 || ball.y + ball.r > h) {
				ball.vy *= -1;
				ball.y = Math.max(ball.r, Math.min(h - ball.r, ball.y));
			}

			const hit = (py: number) =>
				ball.x - ball.r <= 18 + paddle.w &&
				ball.x + ball.r >= 18 &&
				ball.y >= py &&
				ball.y <= py + paddle.h;

			if (hit(left.y) && ball.vx < 0) {
				ball.vx = Math.abs(ball.vx) * 1.04;
				ball.vy += (ball.y - (left.y + paddle.h / 2)) * 0.08;
			}

			if (
				ball.x + ball.r >= w - 18 - paddle.w &&
				ball.x - ball.r <= w - 18 &&
				ball.y >= right.y &&
				ball.y <= right.y + paddle.h &&
				ball.vx > 0
			) {
				ball.vx = -Math.abs(ball.vx) * 1.04;
				ball.vy += (ball.y - (right.y + paddle.h / 2)) * 0.08;
			}

			if (ball.x < 0) {
				p2score += 1;
				serving = 1;
				resetBall(1);
			} else if (ball.x > w) {
				p1score += 1;
				serving = -1;
				resetBall(-1);
			}

			if (p1score >= 7 || p2score >= 7) {
				status = p1score >= 7 ? 'YOU WIN! Tap to restart' : 'CPU WINS! Tap to restart';
			}

			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, w, h);
			ctx.setLineDash([6, 8]);
			ctx.strokeStyle = '#3a6';
			ctx.beginPath();
			ctx.moveTo(w / 2, 0);
			ctx.lineTo(w / 2, h);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = '#cfc';
			ctx.fillRect(18, left.y, paddle.w, paddle.h);
			ctx.fillRect(w - 18 - paddle.w, right.y, paddle.w, paddle.h);

			ctx.beginPath();
			ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = '#fff';
			ctx.font = 'bold 28px Tahoma';
			ctx.fillText(String(p1score), w * 0.25, 36);
			ctx.fillText(String(p2score), w * 0.65, 36);

			raf = requestAnimationFrame(step);
		}

		function onkeydown(ev: KeyboardEvent) {
			keys.add(ev.key.toLowerCase());
			if (ev.key.toLowerCase() === 'r' && (p1score >= 7 || p2score >= 7)) resetMatch();
		}

		function onkeyup(ev: KeyboardEvent) {
			keys.delete(ev.key.toLowerCase());
		}

		const gestures = bindswipegestures(canvas, {
			threshold: 16,
			stepPx: 20,
			repeatMs: 80,
			ondrag(dir) {
				if (dir === 'up' || dir === 'down') swipePaddle = dir;
			},
			onswipe(dir) {
				if (p1score >= 7 || p2score >= 7) {
					resetMatch();
					return;
				}
				if (dir === 'up' || dir === 'down') movePaddle(dir);
			},
			onrelease() {
				swipePaddle = null;
			},
			ontap() {
				if (p1score >= 7 || p2score >= 7) resetMatch();
			}
		});

		resize();
		raf = requestAnimationFrame(step);
		window.addEventListener('keydown', onkeydown);
		window.addEventListener('keyup', onkeyup);
		window.addEventListener('resize', resize);
		const ro = new ResizeObserver(resize);
		ro.observe(canvas.parentElement ?? canvas);

		return () => {
			cancelAnimationFrame(raf);
			gestures.cleanup();
			window.removeEventListener('keydown', onkeydown);
			window.removeEventListener('keyup', onkeyup);
			window.removeEventListener('resize', resize);
			ro.disconnect();
		};
	});

	function setPaddle(dir: 'up' | 'down', active: boolean) {
		if (dir === 'up') paddleUp = active;
		else paddleDown = active;
	}
</script>

<div class="w95-app pong-app">
	<div class="w95-menubar" role="menubar">
		<button type="button">Game</button>
		<button type="button">Options</button>
	</div>
	<div class="w95-workspace pong-stage">
		<canvas bind:this={canvas} class="w95-canvas"></canvas>
		<div class="touch-paddle" aria-hidden="true">
			<button
				type="button"
				class="paddle-btn"
				onpointerdown={() => setPaddle('up', true)}
				onpointerup={() => setPaddle('up', false)}
				onpointerleave={() => setPaddle('up', false)}
				onpointercancel={() => setPaddle('up', false)}
			>▲</button>
			<button
				type="button"
				class="paddle-btn"
				onpointerdown={() => setPaddle('down', true)}
				onpointerup={() => setPaddle('down', false)}
				onpointerleave={() => setPaddle('down', false)}
				onpointercancel={() => setPaddle('down', false)}
			>▼</button>
		</div>
	</div>
	<div class="w95-status">
		<span>{status}</span>
		<span class="hint-touch">swipe ↑↓ on court · ▲▼ buttons</span>
	</div>
</div>

<style>
	.pong-stage {
		position: relative;
	}

	.w95-canvas {
		touch-action: none;
	}

	.touch-paddle {
		display: none;
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		flex-direction: column;
		gap: 8px;
		z-index: 2;
	}

	.paddle-btn {
		width: 44px;
		height: 44px;
		border: 2px solid #fff;
		outline: 1px solid #000;
		background: rgba(192, 192, 192, 0.92);
		font: bold 18px Tahoma, sans-serif;
		color: #000;
		box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff;
		touch-action: manipulation;
	}

	.paddle-btn:active {
		background: #000080;
		color: #fff;
	}

	.hint-touch {
		display: none;
		flex: 0 0 auto !important;
		font-size: 10px;
		white-space: nowrap;
	}

	@media (hover: none), (pointer: coarse) {
		.touch-paddle {
			display: flex;
		}

		.hint-touch {
			display: inline;
		}
	}
</style>
