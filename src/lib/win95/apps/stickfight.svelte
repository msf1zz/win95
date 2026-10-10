<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

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
		let shake = 0;
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
		const dust: { x: number; y: number; s: number; sp: number }[] = Array.from({ length: 24 }, (_, i) => ({
			x: Math.random(),
			y: Math.random() * 0.7,
			s: 0.4 + Math.random() * 1.2,
			sp: 0.0004 + Math.random() * 0.001
		}));

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
			shake = Math.min(14, shake + dmg * 0.35);
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

			// resolve hits during attack frames
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

			// pickup collision
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

		function drawWeapon(f: fighter, x: number, y: number, dir: number, action: action, t: number) {
			const wpn = f.weapon;
			if (wpn.kind === 'fists') return;

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(dir, 1);
			ctx.strokeStyle = wpn.color;
			ctx.fillStyle = wpn.color;
			ctx.lineWidth = 3;

			let angle = -0.4;
			if (action === 'swing') angle = -1.2 + (14 - t) * 0.12;
			else if (action === 'punch') angle = -0.2;
			ctx.rotate(angle);

			if (wpn.kind === 'bat') {
				ctx.fillRect(8, -4, 34, 8);
				ctx.fillStyle = '#5a3d20';
				ctx.fillRect(6, -3, 8, 6);
			} else if (wpn.kind === 'sword') {
				ctx.beginPath();
				ctx.moveTo(6, 2);
				ctx.lineTo(42, -2);
				ctx.lineTo(40, 2);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = '#444';
				ctx.fillRect(2, -2, 8, 6);
			} else if (wpn.kind === 'hammer') {
				ctx.fillStyle = '#666';
				ctx.fillRect(4, -2, 22, 5);
				ctx.fillStyle = '#444';
				ctx.fillRect(20, -10, 16, 14);
			}
			ctx.restore();
		}

		function drawStick(f: fighter, color: string, name: string, hitFlash: number, isP1: boolean) {
			const t = f.actionT;
			const bob = f.action === 'walk' ? Math.sin(frame / 7) * 5 : 0;
			const sx = shake ? (Math.random() - 0.5) * shake : 0;
			const x = f.x + sx;
			const y = f.y + bob;
			const dir = f.facing;
			const attacking = f.action === 'punch' || f.action === 'kick' || f.action === 'swing';

			// shadow
			const shdw = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 22);
			shdw.addColorStop(0, 'rgba(0,0,0,0.45)');
			shdw.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = shdw;
			ctx.beginPath();
			ctx.ellipse(x, y + 4, 22, 6, 0, 0, Math.PI * 2);
			ctx.fill();

			if (attacking) {
				ctx.strokeStyle = `${color}44`;
				ctx.lineWidth = 2;
				for (let i = 0; i < 3; i++) {
					ctx.beginPath();
					ctx.moveTo(x - dir * (20 + i * 14), y - 30 + i * 6);
					ctx.lineTo(x - dir * (48 + i * 18), y - 26 + i * 6);
					ctx.stroke();
				}
			}

			if (hitFlash > 0) {
				ctx.fillStyle = `rgba(255,255,255,${hitFlash * 0.09})`;
				ctx.beginPath();
				ctx.arc(x, y - 36, 34, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.save();
			ctx.shadowColor = color;
			ctx.shadowBlur = attacking ? 16 : 8;
			ctx.strokeStyle = color;
			ctx.lineWidth = 3.5;
			ctx.lineCap = 'round';

			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x, y - 60, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = isP1 ? '#ff6b9d' : '#ff4444';
			ctx.fillRect(x - 10, y - 68, 20, 5);
			// eyes
			ctx.fillStyle = '#111';
			ctx.fillRect(x + dir * 3 - 5, y - 62, 3, 3);
			ctx.fillRect(x + dir * 3 + 2, y - 62, 3, 3);

			ctx.beginPath();
			ctx.moveTo(x, y - 50);
			ctx.lineTo(x, y - 24);
			ctx.stroke();

			let armL = -20;
			let armR = 20;
			let legL = -14;
			let legR = 14;

			if (f.action === 'punch') {
				armR = 34 + (12 - t) * 2;
				armL = -14;
			} else if (f.action === 'kick') {
				legR = 32 + (16 - t) * 2;
				legL = -10;
			} else if (f.action === 'swing') {
				armR = 38;
				armL = -8;
			} else if (f.action === 'walk') {
				legL = Math.sin(frame / 6) * 18;
				legR = -Math.sin(frame / 6) * 18;
			} else if (f.action === 'jump') {
				legL = -10;
				legR = 12;
				armL = -26;
				armR = 26;
			} else if (f.action === 'hit') {
				armL = -34;
				armR = 30;
				ctx.globalAlpha = 0.85;
			}

			ctx.beginPath();
			ctx.moveTo(x, y - 44);
			ctx.lineTo(x + armL * dir * 0.45, y - 36 + armL * 0.12);
			ctx.moveTo(x, y - 44);
			ctx.lineTo(x + armR * dir * 0.55, y - 38 + armR * 0.08);
			ctx.stroke();

			drawWeapon(f, x + armR * dir * 0.55, y - 38, dir, f.action, t);

			ctx.beginPath();
			ctx.moveTo(x, y - 24);
			ctx.lineTo(x + legL * dir * 0.55, y);
			ctx.moveTo(x, y - 24);
			ctx.lineTo(x + legR * dir * 0.55, y);
			ctx.stroke();
			ctx.restore();
		}

		function drawPickup(p: pickup) {
			const y = GROUND() - 14 + Math.sin(frame / 18 + p.bob) * 5;
			const def = WEAPONS[p.kind];
			const pulse = 0.5 + Math.sin(frame / 10) * 0.5;

			const beam = ctx.createLinearGradient(p.x, y - 40, p.x, y);
			beam.addColorStop(0, 'rgba(255,255,180,0)');
			beam.addColorStop(1, `${def.color}55`);
			ctx.fillStyle = beam;
			ctx.fillRect(p.x - 8, y - 40, 16, 40);

			ctx.save();
			ctx.translate(p.x, y);
			ctx.rotate(frame / 20);
			ctx.strokeStyle = `rgba(255,230,120,${0.35 + pulse * 0.35})`;
			ctx.lineWidth = 2;
			ctx.strokeRect(-16, -12, 32, 24);
			ctx.restore();

			const crate = ctx.createLinearGradient(p.x - 15, y - 11, p.x + 15, y + 11);
			crate.addColorStop(0, '#3a3050');
			crate.addColorStop(1, '#1a1428');
			ctx.fillStyle = crate;
			ctx.fillRect(p.x - 15, y - 11, 30, 22);
			ctx.strokeStyle = def.color;
			ctx.lineWidth = 2;
			ctx.strokeRect(p.x - 15, y - 11, 30, 22);
			ctx.fillStyle = def.color;
			ctx.font = 'bold 9px Tahoma';
			ctx.textAlign = 'center';
			ctx.fillText(def.label, p.x, y + 4);
		}

		function drawArena() {
			const g = GROUND();
			const sky = ctx.createLinearGradient(0, 0, 0, g);
			sky.addColorStop(0, '#0c0820');
			sky.addColorStop(0.45, '#1e1240');
			sky.addColorStop(1, '#2a1848');
			ctx.fillStyle = sky;
			ctx.fillRect(0, 0, w, h);

			ctx.fillStyle = '#08051a';
			for (let i = 0; i < 18; i++) {
				const bx = (i * 73 + 10) % (w + 40) - 20;
				const bh = 30 + (i % 5) * 18;
				ctx.fillRect(bx, g - 120 - bh, 36 + (i % 3) * 12, bh);
			}

			for (let i = 0; i < 4; i++) {
				const lx = w * (0.15 + i * 0.23) + Math.sin(frame / 40 + i) * 30;
				const spot = ctx.createRadialGradient(lx, -10, 8, lx, g * 0.55, g * 0.85);
				spot.addColorStop(0, 'rgba(255,210,100,0.22)');
				spot.addColorStop(0.5, 'rgba(255,120,180,0.08)');
				spot.addColorStop(1, 'rgba(255,120,180,0)');
				ctx.fillStyle = spot;
				ctx.fillRect(0, 0, w, g);
			}

			for (const d of dust) {
				d.y -= d.sp;
				if (d.y < 0) d.y = 0.85;
				ctx.fillStyle = `rgba(255,220,180,${0.08 + d.s * 0.06})`;
				ctx.fillRect(d.x * w + Math.sin(frame / 30 + d.x * 10) * 12, d.y * g, d.s, d.s);
			}

			for (let row = 0; row < 4; row++) {
				for (let i = 0; i < 28; i++) {
					const cx = (i * (w / 28) + row * 11) % w;
					const cy = 18 + row * 12 + Math.sin(frame / 20 + i + row) * 2;
					const hue = (i * 37 + row * 60) % 360;
					ctx.fillStyle = `hsl(${hue} 55% ${42 + row * 6}%)`;
					ctx.fillRect(cx, cy, 7, 11);
				}
			}

			const mat = ctx.createLinearGradient(0, g, 0, h);
			mat.addColorStop(0, '#4a6741');
			mat.addColorStop(1, '#2d4228');
			ctx.fillStyle = mat;
			ctx.fillRect(0, g, w, h - g);
			for (let i = 0; i < w; i += 16) {
				ctx.fillStyle = i % 32 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
				ctx.fillRect(i, g + 8, 16, h - g - 8);
			}
			ctx.fillStyle = '#6b4b35';
			ctx.fillRect(0, g, w, 10);

			ctx.font = 'bold 13px Tahoma';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(255,60,120,0.35)';
			ctx.fillText('VOID ARENA', w / 2 + 1, g - 108);
			ctx.fillStyle = '#ff5c9a';
			ctx.shadowColor = '#ff5c9a';
			ctx.shadowBlur = 8 + Math.sin(frame / 8) * 4;
			ctx.fillText('VOID ARENA', w / 2, g - 109);
			ctx.shadowBlur = 0;

			ctx.strokeStyle = '#ff3d6a';
			ctx.lineWidth = 3;
			for (let i = 0; i < 3; i++) {
				const ry = g - 98 - i * 28;
				ctx.beginPath();
				ctx.moveTo(14, ry);
				ctx.lineTo(w - 14, ry);
				ctx.stroke();
			}

			[[18, g - 98], [w - 18, g - 98]].forEach(([px, py]) => {
				const post = ctx.createLinearGradient(px, py, px, g);
				post.addColorStop(0, '#e8c547');
				post.addColorStop(1, '#8a6420');
				ctx.fillStyle = post;
				ctx.fillRect(px - 5, py, 10, g - py + 6);
				ctx.fillStyle = '#ccc';
				ctx.beginPath();
				ctx.arc(px, py, 5, 0, Math.PI * 2);
				ctx.fill();
			});

			if (flash > 0) {
				ctx.fillStyle = `rgba(255,60,100,${flash * 0.09})`;
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
			ctx.rotate(Math.sin(frame / 25) * 0.08);
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
			const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
			vig.addColorStop(0, 'rgba(0,0,0,0)');
			vig.addColorStop(1, 'rgba(0,0,0,0.45)');
			ctx.fillStyle = vig;
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = 'rgba(0,0,0,0.06)';
			for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
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
			ctx.save();
			if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.6);

			drawArena();
			drawHud();
			for (const p of pickups) drawPickup(p);
			drawStick(p1, '#5bc0ff', 'YOU', p1HitFlash, true);
			drawStick(p2, '#ff7b5c', 'CPU', p2HitFlash, false);

			for (const imp of impacts) {
				const r = (1 - imp.life / imp.max) * 28;
				ctx.save();
				ctx.globalAlpha = imp.life / imp.max;
				ctx.strokeStyle = imp.color;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();
			}

			for (const p of particles) {
				if (p.kind === 'ring') {
					ctx.save();
					ctx.globalAlpha = p.life / 10;
					ctx.strokeStyle = p.color;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size + (10 - p.life) * 2, 0, Math.PI * 2);
					ctx.stroke();
					ctx.restore();
				} else {
					ctx.fillStyle = p.color;
					ctx.shadowColor = p.color;
					ctx.shadowBlur = 4;
					ctx.fillRect(p.x, p.y, p.size, p.size);
					ctx.shadowBlur = 0;
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
				ctx.fillStyle = 'rgba(8,4,20,0.72)';
				ctx.fillRect(0, 0, w, h);
				const win = p1.hp > 0;
				ctx.font = 'bold 34px Tahoma';
				ctx.textAlign = 'center';
				ctx.fillStyle = 'rgba(0,0,0,0.55)';
				ctx.fillText('K.O.', w / 2 + 2, h / 2 - 14);
				ctx.fillStyle = win ? '#9ad4ff' : '#ff7b5c';
				ctx.shadowColor = ctx.fillStyle as string;
				ctx.shadowBlur = 18;
				ctx.fillText(win ? 'YOU WIN!' : 'CPU WINS!', w / 2, h / 2 + 18);
				ctx.shadowBlur = 0;
				ctx.font = '12px Tahoma';
				ctx.fillStyle = '#ddd';
				ctx.fillText('click or press R — rematch', w / 2, h / 2 + 48);
			}

			ctx.restore();
			drawPostfx();

			if (shake > 0) shake *= 0.82;
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
			status = `R${round} · YOU ${Math.ceil(p1.hp)} · CPU ${Math.ceil(p2.hp)} · ${weaponLabel} · combo ×${p1.combo}`;
			draw();
			raf = requestAnimationFrame(step);
		}

		function handleCanvasTap(p: { x: number; y: number }) {
			if (p1.hp <= 0 || p2.hp <= 0) {
				rematch();
				return;
			}

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

		function rematch() {
			if (p1.hp > 0 && p2.hp > 0) return;
			round += 1;
			resetFight(true);
		}

		function onkeydown(ev: KeyboardEvent) {
			const k = ev.key.toLowerCase();
			keys.add(k);
			if (k === 'r') rematch();
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
				if (p1.hp <= 0 || p2.hp <= 0) {
					rematch();
					return;
				}
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
		<button type="button" class="w95-btn atk" onclick={punch} title="Punch — or click enemy">👊 Punch</button>
		<button type="button" class="w95-btn atk" onclick={kick} title="Kick">🦵 Kick</button>
		<button type="button" class="w95-btn atk swing" onclick={swing} title="Weapon swing">⚔ Swing</button>
		<span class="w95-sep"></span>
		<span class="wpn-badge">🗡 {weaponLabel}</span>
		<span class="hint">Tap to fight · swipe ←→ move · ↑ jump · ↓ kick</span>
	</div>

	<div class="w95-workspace arena-wrap">
		<div class="arcade-bezel">
			<div class="bezel-top">★ STICK FIGHTER — VOID CHAMPIONSHIP ★</div>
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

	.wpn-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border: 1px solid #808080;
		box-shadow: inset -1px -1px #fff, inset 1px 1px #0a0a0a;
		background: #ffffe1;
		font-weight: 700;
		font-size: 10px;
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

		.wpn-badge {
			flex: 1 1 100%;
			justify-content: center;
			min-height: 28px;
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
