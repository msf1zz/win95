<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

	let { onclose }: { onclose?: () => void } = $props();

	let canvas: HTMLCanvasElement;
	let status = $state('Click enemy to attack · pick up weapons · A/D move');
	let round = $state(1);
	let weaponLabel = $state('fists');

	type weaponkind = 'fists' | 'bat' | 'sword' | 'hammer';

	type weapon = {
		kind: weaponkind;
		label: string;
		dmg: number;
		reach: number;
		hits: number;
		color: string;
	};

	type action = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'swing' | 'hit';

	type fighter = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		hp: number;
		facing: number;
		action: action;
		actionT: number;
		onGround: boolean;
		weapon: weapon;
		hitLock: boolean;
		combo: number;
		attackLanded: boolean;
	};

	type pickup = {
		id: number;
		x: number;
		kind: weaponkind;
		bob: number;
	};

	type particle = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		color: string;
		size: number;
		kind?: 'spark' | 'dust' | 'ring';
	};

	type impact = { x: number; y: number; life: number; max: number; color: string };

	type floattext = {
		x: number;
		y: number;
		text: string;
		life: number;
		color: string;
	};

	const WEAPONS: Record<weaponkind, Omit<weapon, 'hits'>> = {
		fists: { kind: 'fists', label: 'Fists', dmg: 8, reach: 44, color: '#fff' },
		bat: { kind: 'bat', label: 'Bat', dmg: 14, reach: 58, color: '#c4a35a' },
		sword: { kind: 'sword', label: 'Sword', dmg: 18, reach: 62, color: '#9ad4ff' },
		hammer: { kind: 'hammer', label: 'Hammer', dmg: 22, reach: 50, color: '#888' }
	};

	let pendingPunch = $state(false);
	let pendingKick = $state(false);
	let pendingSwing = $state(false);
	let pendingJump = $state(false);
	let comboDisplay = $state(0);

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		const keys = new Set<string>();
		let w = 0;
		let h = 0;
		let raf = 0;
		let closeTimer = 0;
		let flash = 0;
		let pickupId = 0;
		let spawnT = 0;
		let moveTarget: number | null = null;
		let frame = 0;
		let roundIntro = 90;
		let p1HitFlash = 0;
		let p2HitFlash = 0;
		let comboPopup = 0;

		const particles: particle[] = [];
		const floats: floattext[] = [];
		const impacts: impact[] = [];

		const GROUND = () => h - 42;

		let pickups: pickup[] = [];
		let p1: fighter = mkfighter(0.3);
		let p2: fighter = mkfighter(0.7);
		p2.facing = -1;

		function mkweapon(kind: weaponkind): weapon {
			const base = WEAPONS[kind];
			return { ...base, hits: kind === 'fists' ? 999 : 8 };
		}

		function mkfighter(rx: number): fighter {
			return {
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				hp: 100,
				facing: 1,
				action: 'idle',
				actionT: 0,
				onGround: true,
				weapon: mkweapon('fists'),
				hitLock: false,
				combo: 0,
				attackLanded: false
			};
		}

		function resetFight(full = false) {
			p1.x = w * 0.3;
			p2.x = w * 0.7;
			p1.y = p2.y = GROUND();
			p1.vx = p2.vx = p1.vy = p2.vy = 0;
			p1.facing = 1;
			p2.facing = -1;
			p1.action = p2.action = 'idle';
			p1.actionT = p2.actionT = 0;
			p1.hitLock = p2.hitLock = false;
			p1.combo = 0;
			if (full) {
				p1.hp = p2.hp = 100;
				p1.weapon = mkweapon('fists');
				p2.weapon = mkweapon('fists');
				pickups = [];
				spawnT = 0;
			}
			moveTarget = null;
			weaponLabel = p1.weapon.label;
			roundIntro = 90;
			comboPopup = 0;
			p1HitFlash = p2HitFlash = 0;
		}

		function resize() {
			const rect = canvas.getBoundingClientRect();
			w = Math.max(360, rect.width);
			h = Math.max(220, rect.height);
			canvas.width = w;
			canvas.height = h;
			resetFight();
		}

		function spawnPickup() {
			const kinds: weaponkind[] = ['bat', 'sword', 'hammer'];
			const kind = kinds[Math.floor(Math.random() * kinds.length)];
			pickups.push({
				id: ++pickupId,
				x: 60 + Math.random() * (w - 120),
				kind,
				bob: Math.random() * Math.PI * 2
			});
		}

		function burst(x: number, y: number, color: string, n = 10) {
			impacts.push({ x, y, life: 14, max: 14, color });
			for (let i = 0; i < n; i++) {
				particles.push({
					x,
					y,
					vx: (Math.random() - 0.5) * 9,
					vy: (Math.random() - 0.5) * 9 - 2.5,
					life: 20 + Math.random() * 14,
					color,
					size: 2 + Math.random() * 3,
					kind: 'spark'
				});
			}
			for (let i = 0; i < 4; i++) {
				particles.push({
					x,
					y,
					vx: 0,
					vy: 0,
					life: 10,
					color,
					size: 6 + i * 5,
					kind: 'ring'
				});
			}
		}

		function dmgText(x: number, y: number, dmg: number, crit = false) {
			floats.push({
				x,
				y,
				text: `-${dmg}`,
				life: 36,
				color: crit ? '#ffe566' : '#ff8a8a'
			});
		}

		function hurt(target: fighter, src: fighter, dmg: number) {
			if (target.hitLock || target.hp <= 0) return;
			target.hp = Math.max(0, target.hp - dmg);
			target.action = 'hit';
			target.actionT = 14;
			target.hitLock = true;
			target.vx = (target.x > src.x ? 1 : -1) * (4 + dmg * 0.15);
			target.vy = -4 - dmg * 0.08;
			target.onGround = false;
			flash = 4;
			burst(target.x, target.y - 40, src.weapon.color, 12);
			dmgText(target.x, target.y - 72, dmg, dmg >= 18);
			if (target === p1) p1HitFlash = 10;
			else p2HitFlash = 10;
			if (src === p1) {
				src.combo += 1;
				comboPopup = 40;
				comboDisplay = src.combo;
			}
		}

		function bodyBox(f: fighter) {
			return { x: f.x - 16, y: f.y - 74, w: 32, h: 74 };
		}

		function attackBox(f: fighter, reach: number, yOff: number, hgt: number) {
			const x1 = f.facing > 0 ? f.x + 10 : f.x - 10 - reach;
			return { x: x1, y: f.y - yOff - hgt, w: reach, h: hgt };
		}

		function overlap(
			a: { x: number; y: number; w: number; h: number },
			b: { x: number; y: number; w: number; h: number }
		) {
			return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
		}

		function tryHit(attacker: fighter, defender: fighter, reach: number, dmg: number, yOff: number, hgt: number) {
			if (attacker.actionT <= 0 || defender.hp <= 0 || attacker.attackLanded) return;
			const active =
				attacker.action === 'punch'
					? attacker.actionT <= 7 && attacker.actionT >= 3
					: attacker.action === 'kick'
						? attacker.actionT <= 10 && attacker.actionT >= 4
						: attacker.action === 'swing'
							? attacker.actionT <= 9 && attacker.actionT >= 2
							: false;
			if (!active) return;
			const box = attackBox(attacker, reach, yOff, hgt);
			if (overlap(box, bodyBox(defender))) {
				attacker.attackLanded = true;
				hurt(defender, attacker, dmg);
				if (attacker.weapon.kind !== 'fists') {
					attacker.weapon.hits -= 1;
					if (attacker.weapon.hits <= 0) attacker.weapon = mkweapon('fists');
					if (attacker === p1) weaponLabel = p1.weapon.label;
				}
			}
		}

		function startAttack(f: fighter, kind: 'punch' | 'kick' | 'swing') {
			if (f.hp <= 0 || f.action === 'hit' || f.hitLock) return false;
			if (f.action !== 'idle' && f.action !== 'walk') return false;

			f.action = kind === 'swing' && f.weapon.kind !== 'fists' ? 'swing' : kind;
			f.actionT = kind === 'kick' ? 16 : kind === 'swing' ? 14 : 12;
			f.attackLanded = false;
			if (f === p1) moveTarget = null;
			return true;
		}

		function pickupWeapon(f: fighter, kind: weaponkind) {
			f.weapon = mkweapon(kind);
			if (f === p1) weaponLabel = f.weapon.label;
		}

		function tickFighter(f: fighter, opp: fighter, left: boolean, right: boolean, jump: boolean) {
			if (f.hp <= 0) return;

			if (f.hitLock) {
				f.actionT -= 1;
				if (f.actionT <= 0) {
					f.hitLock = false;
					f.action = 'idle';
				}
			}

			if (f.actionT > 0 && f.action !== 'hit') f.actionT -= 1;
			if (f.actionT <= 0 && f.action !== 'idle' && f.action !== 'walk' && f.action !== 'hit') {
				f.action = 'idle';
			}

			if (f.action === 'hit') {
				f.vy += 0.6;
				f.x += f.vx;
				f.y += f.vy;
				f.vx *= 0.92;
				if (f.y >= GROUND()) {
					f.y = GROUND();
					f.vy = 0;
					f.onGround = true;
				}
				return;
			}

			if (f.action === 'punch') {
				tryHit(f, opp, f.weapon.reach, f.weapon.dmg, 50, 40);
			} else if (f.action === 'kick') {
				tryHit(f, opp, f.weapon.reach + 8, f.weapon.dmg + 4, 30, 36);
			} else if (f.action === 'swing') {
				tryHit(f, opp, f.weapon.reach + 12, f.weapon.dmg + 6, 55, 50);
			}

			f.vx = 0;
			const wantLeft = left || (moveTarget !== null && f === p1 && moveTarget < f.x - 8);
			const wantRight = right || (moveTarget !== null && f === p1 && moveTarget > f.x + 8);

			if (f.action === 'idle' || f.action === 'walk') {
				if (wantLeft) {
					f.vx = -4;
					f.facing = -1;
					f.action = 'walk';
				} else if (wantRight) {
					f.vx = 4;
					f.facing = 1;
					f.action = 'walk';
				} else if (f.onGround) {
					f.action = 'idle';
					if (f === p1 && moveTarget !== null && Math.abs(f.x - moveTarget) < 10) moveTarget = null;
				}
			}

			if (jump && f.onGround && (f.action === 'idle' || f.action === 'walk')) {
				f.vy = -10;
				f.onGround = false;
				f.action = 'jump';
			}

			f.vy += 0.58;
			f.x = Math.max(28, Math.min(w - 28, f.x + f.vx));
			f.y += f.vy;
			if (f.y >= GROUND()) {
				f.y = GROUND();
				f.vy = 0;
				f.onGround = true;
			} else {
				f.onGround = false;
			}

			if (f.action === 'idle' || f.action === 'walk') {
				f.facing = f.x < opp.x ? 1 : -1;
			}

			for (let i = pickups.length - 1; i >= 0; i--) {
				const p = pickups[i];
				if (Math.abs(f.x - p.x) < 22 && f.onGround) {
					pickupWeapon(f, p.kind);
					pickups.splice(i, 1);
					burst(p.x, GROUND() - 20, WEAPONS[p.kind].color, 8);
				}
			}
		}

		function ai() {
			const dist = Math.abs(p2.x - p1.x);
			const left = p1.x < p2.x - 36;
			const right = p1.x > p2.x + 36;
			const jump = p1.action === 'swing' && Math.random() < 0.05;

			if (dist < p2.weapon.reach + 20 && Math.random() < 0.07) {
				startAttack(p2, p2.weapon.kind !== 'fists' ? 'swing' : Math.random() < 0.5 ? 'punch' : 'kick');
			} else if (dist < 90 && Math.random() < 0.04) {
				startAttack(p2, 'kick');
			}

			tickFighter(p2, p1, left, right, jump);
		}

		function stamp(cells: Map<string, string>, ox: number, oy: number, dir: number, outline: string) {
			const keys = new Set(cells.keys());
			ctx.fillStyle = outline;
			for (const key of keys) {
				const [x, y] = key.split(',').map(Number);
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					if (keys.has(`${x + dx},${y + dy}`)) continue;
					const nx = x + dx;
					const sx = dir > 0 ? ox + nx : ox - nx - 1;
					ctx.fillRect(sx, oy + y + dy, 1, 1);
				}
			}
			for (const [key, color] of cells) {
				const [x, y] = key.split(',').map(Number);
				const sx = dir > 0 ? ox + x : ox - x - 1;
				ctx.fillStyle = color;
				ctx.fillRect(sx, oy + y, 1, 1);
			}
		}

		function drawWeapon(f: fighter, ox: number, oy: number, dir: number, hand: [number, number]) {
			const kind = f.weapon.kind;
			if (kind === 'fists') return;
			const cells = new Map<string, string>();
			const col = kind === 'bat' ? '#e6c27a' : kind === 'sword' ? '#e7f4ff' : '#b9b9b9';
			const dark = kind === 'bat' ? '#8a5a28' : kind === 'sword' ? '#f2d35a' : '#6e6e6e';
			const dx = hand[0];
			const dy = hand[1] + 52;
			const len = Math.hypot(dx, dy) || 1;
			const reach = kind === 'hammer' ? 16 : kind === 'sword' ? 26 : 22;
			const x1 = Math.round(hand[0] + (dx / len) * reach);
			const y1 = Math.round(hand[1] + (dy / len) * reach);
			let x = hand[0];
			let y = hand[1];
			const sx = x < x1 ? 1 : -1;
			const sy = y < y1 ? 1 : -1;
			const adx = Math.abs(x1 - x);
			const ady = Math.abs(y1 - y);
			let err = adx - ady;
			let step = 0;
			while (true) {
				const tone = step < 5 ? dark : col;
				for (let iy = -1; iy <= 1; iy++) {
					for (let ix = -1; ix <= 1; ix++) cells.set(`${x + ix},${y + iy}`, tone);
				}
				if (x === x1 && y === y1) break;
				const e2 = 2 * err;
				if (e2 > -ady) {
					err -= ady;
					x += sx;
				}
				if (e2 < adx) {
					err += adx;
					y += sy;
				}
				step += 1;
			}
			if (kind === 'hammer') {
				for (let iy = -4; iy <= 3; iy++) {
					for (let ix = -2; ix <= 5; ix++) cells.set(`${x1 + ix},${y1 + iy}`, iy < -2 ? '#efefef' : '#8d8d8d');
				}
			} else if (kind === 'bat') {
				for (let iy = -2; iy <= 2; iy++) {
					for (let ix = -1; ix <= 3; ix++) cells.set(`${x1 + ix},${y1 + iy}`, '#f3e2b4');
				}
			}
			stamp(cells, ox, oy, dir, '#120c08');
		}

		function drawStick(f: fighter, color: string, _name: string, hitFlash: number, isP1: boolean) {
			const bob = f.action === 'walk' ? (Math.floor(frame / 8) % 2 === 0 ? -1 : 1) : 0;
			const x = Math.round(f.x);
			const y = Math.round(f.y) + bob;
			const dir = f.facing;
			const step = Math.floor(frame / 8) % 2;
			const flashOn = hitFlash > 0 && hitFlash % 2 === 0;
			const body = flashOn ? '#ffffff' : color;
			const shade = flashOn ? '#f2f2f2' : isP1 ? '#1b86d8' : '#e24c1a';
			const glove = flashOn ? '#ffffff' : isP1 ? '#d9f4ff' : '#ffd2b8';
			const band = isP1 ? '#ff4d88' : '#ffe14a';
			const outline = isP1 ? '#071018' : '#1c0c08';
			const cells = new Map<string, string>();

			function put(px: number, py: number, fill: string) {
				cells.set(`${px},${py}`, fill);
			}

			function blob(cx: number, cy: number, fill: string) {
				for (let iy = -1; iy <= 1; iy++) {
					for (let ix = -1; ix <= 1; ix++) {
						const px = cx + ix;
						put(px, cy + iy, fill === body && px < -1 ? shade : fill);
					}
				}
			}

			function limb(x0: number, y0: number, x1: number, y1: number, fill: string) {
				let lx = x0;
				let ly = y0;
				const adx = Math.abs(x1 - x0);
				const ady = Math.abs(y1 - y0);
				const sx = x0 < x1 ? 1 : -1;
				const sy = y0 < y1 ? 1 : -1;
				let err = adx - ady;
				while (true) {
					blob(lx, ly, fill);
					if (lx === x1 && ly === y1) break;
					const e2 = 2 * err;
					if (e2 > -ady) {
						err -= ady;
						lx += sx;
					}
					if (e2 < adx) {
						err += adx;
						ly += sy;
					}
				}
			}

			function rect(rx: number, ry: number, rw: number, rh: number, fill: string) {
				for (let iy = 0; iy < rh; iy++) {
					for (let ix = 0; ix < rw; ix++) put(rx + ix, ry + iy, fill);
				}
			}

			let backHand: [number, number];
			let frontHand: [number, number];
			let backFoot: [number, number];
			let frontFoot: [number, number];

			if (f.action === 'punch') {
				backHand = [-10, -46];
				frontHand = [24, -50];
				backFoot = [-6, -2];
				frontFoot = [8, -2];
			} else if (f.action === 'kick') {
				backHand = [-12, -60];
				frontHand = [8, -56];
				backFoot = [-6, -2];
				frontFoot = [22, -18];
			} else if (f.action === 'swing') {
				backHand = [-8, -48];
				frontHand = [14, -70];
				backFoot = [-7, -2];
				frontFoot = [7, -2];
			} else if (f.action === 'jump') {
				backHand = [-10, -68];
				frontHand = [10, -68];
				backFoot = [-8, -20];
				frontFoot = [8, -20];
			} else if (f.action === 'hit') {
				backHand = [-16, -62];
				frontHand = [14, -40];
				backFoot = [-2, -2];
				frontFoot = [11, -2];
			} else if (f.action === 'walk' && step === 0) {
				backHand = [-12, -58];
				frontHand = [12, -34];
				backFoot = [-4, -2];
				frontFoot = [12, -2];
			} else if (f.action === 'walk') {
				backHand = [-10, -34];
				frontHand = [10, -58];
				backFoot = [-12, -2];
				frontFoot = [4, -2];
			} else {
				backHand = [-11, -40];
				frontHand = [11, -40];
				backFoot = [-6, -2];
				frontFoot = [6, -2];
			}

			limb(-1, -54, backHand[0], backHand[1], body);
			limb(0, -34, backFoot[0], backFoot[1], body);
			limb(1, -52, frontHand[0], frontHand[1], body);
			limb(0, -32, frontFoot[0], frontFoot[1], body);
			limb(0, -62, 0, -32, body);
			for (const [hy, hx, hw] of [
				[-76, -2, 5],
				[-75, -4, 9],
				[-74, -5, 11],
				[-73, -6, 13],
				[-72, -6, 13],
				[-71, -6, 13],
				[-70, -6, 13],
				[-69, -6, 13],
				[-68, -6, 13],
				[-67, -5, 11],
				[-66, -4, 9],
				[-65, -2, 5]
			] as [number, number, number][]) {
				for (let i = 0; i < hw; i++) {
					const px = hx + i;
					put(px, hy, px < -1 ? shade : body);
				}
			}
			for (let hy = -76; hy <= -73; hy++) {
				for (let hx = -6; hx <= 6; hx++) {
					if (cells.has(`${hx},${hy}`)) put(hx, hy, band);
				}
			}
			put(-4, -75, '#f7fbff');
			put(-3, -75, '#f7fbff');
			rect(1, -71, 2, 2, '#12141a');
			rect(4, -71, 2, 2, '#12141a');
			rect(backFoot[0] - 2, backFoot[1] - 1, 6, 3, '#171717');
			rect(frontFoot[0] - 2, frontFoot[1] - 1, 6, 3, '#171717');
			rect(backHand[0] - 2, backHand[1] - 2, 4, 4, glove);
			rect(frontHand[0] - 2, frontHand[1] - 2, 4, 4, glove);

			ctx.fillStyle = 'rgba(0,0,0,0.35)';
			ctx.fillRect(x - 9, y - 1, 18, 2);
			ctx.fillRect(x - 5, y - 2, 10, 1);

			drawWeapon(f, x, y, dir, frontHand);
			stamp(cells, x, y, dir, outline);
		}

		function drawPickup(p: pickup) {
			const y = GROUND() - 6 + (Math.floor(frame / 18 + p.bob) % 2 === 0 ? 0 : -1);
			const x = Math.round(p.x);
			ctx.fillStyle = 'rgba(0,0,0,0.35)';
			ctx.fillRect(x - 8, y + 1, 16, 2);
			if (p.kind === 'bat') {
				ctx.fillStyle = '#8a5a28';
				ctx.fillRect(x - 8, y - 2, 4, 3);
				ctx.fillStyle = '#e6c27a';
				ctx.fillRect(x - 4, y - 3, 12, 5);
			} else if (p.kind === 'sword') {
				ctx.fillStyle = '#f2d35a';
				ctx.fillRect(x - 8, y - 4, 3, 8);
				ctx.fillStyle = '#e7f4ff';
				ctx.fillRect(x - 5, y - 2, 14, 2);
			} else {
				ctx.fillStyle = '#6e6e6e';
				ctx.fillRect(x - 8, y - 1, 8, 3);
				ctx.fillStyle = '#b9b9b9';
				ctx.fillRect(x - 1, y - 5, 8, 8);
			}
		}

		function drawArena() {
			const g = GROUND();
			ctx.fillStyle = '#12141f';
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#1a1e30';
			const horizon = Math.floor(g * 0.62);
			ctx.fillRect(0, horizon, w, g - horizon);

			ctx.fillStyle = '#c5cdea';
			for (let i = 0; i < 14; i++) {
				const sx = (i * 149 + 17) % Math.max(1, w - 2);
				const sy = (i * 47 + 10) % Math.max(1, horizon - 4);
				ctx.fillRect(sx, sy, 2, 2);
			}

			ctx.fillStyle = '#232838';
			ctx.fillRect(0, g, w, h - g);
			ctx.fillStyle = '#3c4560';
			ctx.fillRect(0, g, w, 2);
			ctx.fillStyle = '#1b2030';
			for (let tx = 10; tx < w; tx += 32) ctx.fillRect(tx, g + 12, 12, 2);

			if (flash > 0) {
				ctx.fillStyle = `rgba(255,60,100,${flash * 0.12})`;
				ctx.fillRect(0, 0, w, h);
				flash -= 0.35;
			}
		}

		function drawHud() {
			const pad = 10;
			const barW = Math.min(180, w * 0.38);
			const barH = 14;

			function hpBar(x: number, y: number, hp: number, align: 'left' | 'right', accent: string, label: string) {
				const pct = hp / 100;
				ctx.textAlign = align;
				ctx.font = 'bold 11px Tahoma';
				ctx.fillStyle = 'rgba(0,0,0,0.55)';
				ctx.fillText(label, x + (align === 'left' ? 1 : -1), y - 5);
				ctx.fillStyle = '#fff';
				ctx.fillText(label, x, y - 6);
				const bx = align === 'left' ? x : x - barW;
				ctx.fillStyle = '#1a0a14';
				ctx.fillRect(bx - 2, y - 2, barW + 4, barH + 4);
				ctx.fillStyle = '#330818';
				ctx.fillRect(bx, y, barW, barH);
				const grad = ctx.createLinearGradient(bx, y, bx + barW * pct, y);
				grad.addColorStop(0, accent);
				grad.addColorStop(1, pct > 0.3 ? '#7dff9a' : '#ff5555');
				ctx.fillStyle = grad;
				ctx.fillRect(bx, y, barW * pct, barH);
				ctx.strokeStyle = 'rgba(255,255,255,0.7)';
				ctx.lineWidth = 1;
				ctx.strokeRect(bx, y, barW, barH);
			}

			hpBar(pad + 4, pad + 18, p1.hp, 'left', '#5bc0ff', 'YOU');
			hpBar(w - pad - 4, pad + 18, p2.hp, 'right', '#ff7b5c', 'CPU');

			ctx.save();
			ctx.translate(w / 2, pad + 24);
			ctx.fillStyle = '#1a1030';
			ctx.fillRect(-22, -12, 44, 24);
			ctx.strokeStyle = '#ffe566';
			ctx.lineWidth = 2;
			ctx.strokeRect(-22, -12, 44, 24);
			ctx.font = 'bold 14px Tahoma';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#ffe566';
			ctx.shadowColor = '#ffe566';
			ctx.shadowBlur = 10;
			ctx.fillText('VS', 0, 5);
			ctx.restore();
			ctx.shadowBlur = 0;

			ctx.font = 'bold 10px Tahoma';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#1a1030';
			ctx.fillRect(w / 2 - 36, pad + 44, 72, 16);
			ctx.fillStyle = '#ff9ecf';
			ctx.fillText(`ROUND ${round}`, w / 2, pad + 56);
		}

		function drawPostfx() {
			ctx.fillStyle = 'rgba(0,0,0,0.08)';
			for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
		}

		function drawIntro() {
			if (roundIntro <= 0) return;
			const alpha = Math.min(1, roundIntro / 30);
			ctx.fillStyle = `rgba(0,0,0,${0.55 * alpha})`;
			ctx.fillRect(0, 0, w, h);
			const text = roundIntro > 40 ? `ROUND ${round}` : 'FIGHT!';
			const scale = 1 + (1 - Math.min(1, roundIntro / 20)) * 0.25;
			ctx.save();
			ctx.translate(w / 2, h / 2);
			ctx.scale(scale, scale);
			ctx.font = 'bold 42px Tahoma';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(0,0,0,0.6)';
			ctx.fillText(text, 2, 2);
			ctx.fillStyle = roundIntro > 40 ? '#9ad4ff' : '#ffe566';
			ctx.shadowColor = ctx.fillStyle as string;
			ctx.shadowBlur = 20;
			ctx.fillText(text, 0, 0);
			ctx.restore();
			ctx.shadowBlur = 0;
		}

		function draw() {
			ctx.imageSmoothingEnabled = false;
			ctx.save();

			drawArena();
			drawHud();
			for (const p of pickups) drawPickup(p);
			drawStick(p1, '#5bc0ff', 'YOU', p1HitFlash, true);
			drawStick(p2, '#ff7b5c', 'CPU', p2HitFlash, false);

			for (const imp of impacts) {
				const r = Math.round((1 - imp.life / imp.max) * 12) * 2;
				ctx.save();
				ctx.globalAlpha = imp.life / imp.max;
				ctx.strokeStyle = imp.color;
				ctx.lineWidth = 2;
				ctx.strokeRect(Math.round(imp.x) - r, Math.round(imp.y) - r, r * 2, r * 2);
				ctx.restore();
			}

			for (const p of particles) {
				const sz = Math.max(2, Math.round(p.size / 2) * 2);
				if (p.kind === 'ring') {
					ctx.save();
					ctx.globalAlpha = p.life / 10;
					ctx.strokeStyle = p.color;
					ctx.lineWidth = 2;
					const r = Math.round((p.size + (10 - p.life) * 2) / 2) * 2;
					ctx.strokeRect(Math.round(p.x) - r, Math.round(p.y) - r, r * 2, r * 2);
					ctx.restore();
				} else {
					ctx.fillStyle = p.color;
					ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
				}
			}

			for (const f of floats) {
				const scale = 1 + (1 - f.life / 36) * 0.35;
				ctx.save();
				ctx.translate(f.x, f.y - (36 - f.life));
				ctx.scale(scale, scale);
				ctx.font = 'bold 15px Tahoma';
				ctx.textAlign = 'center';
				ctx.fillStyle = 'rgba(0,0,0,0.5)';
				ctx.fillText(f.text, 1, 1);
				ctx.fillStyle = f.color;
				ctx.fillText(f.text, 0, 0);
				ctx.restore();
			}

			if (comboPopup > 0 && p1.combo > 1) {
				const s = 1 + (comboPopup / 40) * 0.5;
				ctx.save();
				ctx.translate(w / 2, h * 0.32);
				ctx.scale(s, s);
				ctx.font = 'bold 22px Tahoma';
				ctx.textAlign = 'center';
				ctx.fillStyle = '#ffe566';
				ctx.shadowColor = '#ff6b9d';
				ctx.shadowBlur = 14;
				ctx.fillText(`${p1.combo} HIT COMBO!`, 0, 0);
				ctx.restore();
				ctx.shadowBlur = 0;
			}

			drawIntro();

			if (p1.hp <= 0 || p2.hp <= 0) {
				ctx.font = 'bold 34px Tahoma';
				ctx.textAlign = 'center';
				ctx.fillStyle = '#fff';
				ctx.shadowBlur = 0;
				ctx.fillText('you lost', w / 2, h / 2);
			}

			ctx.restore();
			drawPostfx();

			if (p1HitFlash > 0) p1HitFlash -= 1;
			if (p2HitFlash > 0) p2HitFlash -= 1;
			if (roundIntro > 0) roundIntro -= 1;
			if (comboPopup > 0) comboPopup -= 1;
		}

		function step() {
			if (p1.hp > 0 && p2.hp > 0) {
				if (pendingPunch) {
					startAttack(p1, 'punch');
					pendingPunch = false;
				}
				if (pendingKick) {
					startAttack(p1, 'kick');
					pendingKick = false;
				}
				if (pendingSwing) {
					startAttack(p1, p1.weapon.kind !== 'fists' ? 'swing' : 'punch');
					pendingSwing = false;
				}
				const jump = keys.has('w') || keys.has(' ') || pendingJump;
				if (pendingJump) pendingJump = false;

				tickFighter(p1, p2, keys.has('a'), keys.has('d'), jump);
				ai();

				spawnT += 1;
				if (spawnT > 280 && pickups.length < 2) {
					spawnPickup();
					spawnT = 0;
				}
			}

			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.25;
				p.life -= 1;
				if (p.life <= 0) particles.splice(i, 1);
			}
			for (let i = floats.length - 1; i >= 0; i--) {
				floats[i].life -= 1;
				if (floats[i].life <= 0) floats.splice(i, 1);
			}
			for (let i = impacts.length - 1; i >= 0; i--) {
				impacts[i].life -= 1;
				if (impacts[i].life <= 0) impacts.splice(i, 1);
			}

			frame += 1;
			const lost = p1.hp <= 0 || p2.hp <= 0;
			status = lost
				? 'you lost'
				: `R${round} · YOU ${Math.ceil(p1.hp)} · CPU ${Math.ceil(p2.hp)} · ${weaponLabel} · combo ×${p1.combo}`;
			if (lost && !closeTimer) {
				closeTimer = window.setTimeout(() => onclose?.(), 900);
			}
			draw();
			raf = requestAnimationFrame(step);
		}

		function handleCanvasTap(p: { x: number; y: number }) {
			if (p1.hp <= 0 || p2.hp <= 0) return;

			const dist = Math.abs(p1.x - p2.x);
			const clickOpp = p.x > w * 0.5 || Math.abs(p.x - p2.x) < 50;
			if (clickOpp && dist < p1.weapon.reach + 55) {
				if (p1.weapon.kind !== 'fists') pendingSwing = true;
				else if (dist < 55) pendingPunch = true;
				else pendingKick = true;
				p1.facing = p2.x > p1.x ? 1 : -1;
			} else if (p.y > GROUND() - 40) {
				moveTarget = Math.max(40, Math.min(w - 40, p.x));
			} else {
				pendingPunch = true;
			}
		}

		function onkeydown(ev: KeyboardEvent) {
			const k = ev.key.toLowerCase();
			keys.add(k);
			if (k === 'z' || k === 'j') pendingPunch = true;
			if (k === 'x' || k === 'k') pendingKick = true;
			if (k === 'c' || k === 'l') pendingSwing = true;
		}

		function onkeyup(ev: KeyboardEvent) {
			keys.delete(ev.key.toLowerCase());
		}

		const gestures = bindswipegestures(canvas, {
			threshold: 18,
			stepPx: 24,
			ontap(p) {
				handleCanvasTap(p);
			},
			onswipe(dir) {
				if (p1.hp <= 0 || p2.hp <= 0) return;
				if (dir === 'left') moveTarget = Math.max(40, p1.x - 90);
				else if (dir === 'right') moveTarget = Math.min(w - 40, p1.x + 90);
				else if (dir === 'up') pendingJump = true;
				else if (dir === 'down') pendingKick = true;
			},
			ondrag(dir) {
				if (p1.hp <= 0 || p2.hp <= 0) return;
				if (dir === 'left') keys.add('a');
				else if (dir === 'right') keys.add('d');
			},
			onrelease() {
				keys.delete('a');
				keys.delete('d');
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
			clearTimeout(closeTimer);
			gestures.cleanup();
			window.removeEventListener('keydown', onkeydown);
			window.removeEventListener('keyup', onkeyup);
			window.removeEventListener('resize', resize);
			ro.disconnect();
		};
	});

	function punch() { pendingPunch = true; }
	function kick() { pendingKick = true; }
	function swing() { pendingSwing = true; }
</script>

<div class="w95-app fight-app">
	<div class="w95-menubar" role="menubar">
		<button type="button">Game</button>
		<button type="button">Fight</button>
		<button type="button">Help</button>
	</div>

	<div class="w95-toolbar fight-bar">
		<button type="button" class="w95-btn atk" onclick={punch} title="Punch — or click enemy">Punch</button>
		<button type="button" class="w95-btn atk" onclick={kick} title="Kick">Kick</button>
		<button type="button" class="w95-btn atk swing" onclick={swing} title="Weapon swing">Swing</button>
	</div>

	<div class="w95-workspace arena-wrap">
		<div class="arcade-bezel">
			<canvas bind:this={canvas} class="w95-canvas fight-canvas"></canvas>
			{#if comboDisplay > 1}
				<div class="combo-pill">×{comboDisplay} combo</div>
			{/if}
		</div>
	</div>

	<div class="w95-status"><span>{status}</span></div>
</div>

<style>
	.fight-app {
		background: #c0c0c0;
	}

	.fight-bar {
		flex-wrap: wrap;
		gap: 6px;
	}

	.atk {
		min-width: 72px;
		height: 26px;
		font-weight: 700;
	}

	.atk.swing {
		color: #000080;
	}

	.hint {
		font-size: 10px;
		color: #404040;
		margin-left: auto;
	}

	.arena-wrap {
		background: #1a1428;
		display: flex;
		align-items: stretch;
		justify-content: center;
		padding: 6px;
	}

	.arcade-bezel {
		position: relative;
		flex: 1;
		min-height: 0;
		border: 3px solid;
		border-color: #fff #404040 #404040 #fff;
		outline: 1px solid #000;
		box-shadow:
			inset 0 0 0 1px #808080,
			0 0 18px rgba(255, 90, 160, 0.25);
		background: #0a0814;
	}

	.bezel-top {
		padding: 3px 8px;
		text-align: center;
		font: bold 9px/1.4 Tahoma, sans-serif;
		letter-spacing: 0.14em;
		color: #ffe566;
		background: linear-gradient(180deg, #2a1848, #120a22);
		border-bottom: 1px solid #ff5c9a44;
		text-shadow: 0 0 8px rgba(255, 92, 154, 0.6);
	}

	.fight-canvas {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 200px;
		cursor: crosshair;
		touch-action: none;
	}

	.combo-pill {
		position: absolute;
		top: 28px;
		right: 10px;
		padding: 3px 10px;
		font: bold 11px Tahoma, sans-serif;
		color: #1a1030;
		background: linear-gradient(180deg, #ffe566, #ffb347);
		border: 2px solid #fff;
		outline: 1px solid #000;
		box-shadow: 0 0 12px rgba(255, 230, 100, 0.55);
		animation: combo-pop 0.35s ease;
	}

	@keyframes combo-pop {
		from {
			transform: scale(0.6);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.atk:hover {
		background: #000080;
		color: #fff;
	}

	@media (max-width: 1023px) {
		.hint {
			display: none;
		}

		.fight-bar {
			justify-content: flex-start;
		}

		.atk {
			min-width: 0;
			flex: 1 1 calc(33% - 6px);
			min-height: 40px;
			font-size: 11px;
		}

		.bezel-top {
			font-size: 8px;
			letter-spacing: 0.08em;
		}
	}

	@media (hover: none), (pointer: coarse) {
		.fight-bar .hint {
			display: none;
		}

		.fight-bar::after {
			content: 'Tap to fight · swipe ←→ move · ↑ jump · ↓ kick';
			flex: 1 1 100%;
			font-size: 10px;
			color: #404040;
			padding-top: 2px;
		}
	}
</style>
