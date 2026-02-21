import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Button } from '@/components/ui/button';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePlayerData } from '@/hooks/usePlayerData';

import {
  Shield, Zap, Wind, Swords, GitBranch, X, ChevronRight,
  ChevronsRight, RotateCcw, Star, Flame, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Resource icons ── */
const RES_ICONS: Record<string, string> = {
  ore:     '/images/resources/orelogo.png',
  gold:    '/images/resources/goldlogo.png',
  diamond: '/images/resources/diamondlogo.png',
  mana:    '/images/resources/manalogo.png',
};

type ResourceCost = { ore?: number; gold?: number; diamond?: number; mana?: number };

/* ── Skill node types ── */
type NodeIcon = 'root' | 'sword' | 'shield' | 'zap' | 'wind' | 'dash' | 'clock' | 'star' | 'flame' | 'sparkles';

interface SkillNode {
  id: string;
  label: string;
  description: string;
  icon: NodeIcon;
  cost: ResourceCost;
  requires: string | null;  // null = root (always unlocked)
  x: number;               // px in 500×285 canvas
  y: number;
}

const NODE_ICON_MAP: Record<NodeIcon, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  root:     GitBranch,
  sword:    Swords,
  shield:   Shield,
  zap:      Zap,
  wind:     Wind,
  dash:     ChevronsRight,
  clock:    RotateCcw,
  star:     Star,
  flame:    Flame,
  sparkles: Sparkles,
};

/* ── Animated sprite canvas ── */
const AnimatedSprite = ({
  src, frames, frameWidth, frameHeight, frameDuration = 150, size = 80, portrait = false,
  portraitZoom = 1.8, portraitOffsetX = 0, portraitOffsetY = -0.1,
}: {
  src: string; frames: number; frameWidth: number; frameHeight: number;
  frameDuration?: number; size?: number; portrait?: boolean;
  portraitZoom?: number; portraitOffsetX?: number; portraitOffsetY?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const rafRef    = useRef(0);

  const canvasSize = size;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !canvas || !img || !img.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (portrait) {
      // Draw full frame — circle container clips to show character
      ctx.drawImage(img, frameRef.current * frameWidth, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(img, frameRef.current * frameWidth, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    }
  }, [frameWidth, frameHeight, portrait, portraitZoom, portraitOffsetX, portraitOffsetY]);

  useEffect(() => {
    const img = new Image();
    imgRef.current = img;
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
    // handle already-cached images (onload won't fire)
    if (img.complete) { imgRef.current = img; draw(); }
  }, [src, draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= frameDuration) {
        timerRef.current -= frameDuration;
        frameRef.current = (frameRef.current + 1) % frames;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, frameDuration, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className="animated-sprite"
      style={{ imageRendering: 'pixelated', flexShrink: 0,
        width: size, height: size,
        ...(portrait ? {} : { transform: 'scale(1.8)', transformOrigin: 'bottom center' })
      }}
    />
  );
};

/* ── Hero data ── */
const heroes = [
  {
    id: 1,
    name: 'Samurai Commander',
    class: 'Warrior',
    description: 'A master of the blade who leads from the front. Unmatched discipline forged through a thousand battles.',
    stats: { power: 85, defense: 78, speed: 72 },
    color: 'from-cyan-500/20 to-blue-600/10',
    accent: 'text-cyan-400',
    accentHex: '#22d3ee',
    border: 'border-cyan-500/30',
    idleSprite: { src: '/heroes/Idle.png', frames: 6, frameWidth: 128, frameHeight: 128 },
    spriteX: 105, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Samurai',        description:'Your warrior core. Unlock nodes to evolve.', icon:'root',     cost:{},                                   requires:null,    x:250, y:310 },
      { id:'speed',  label:'Swift Stride',   description:'Movement speed +18%. Dodge window +0.2 s.',  icon:'wind',     cost:{ ore:30, gold:15 },                    requires:'root',  x:140, y:245 },
      { id:'attack', label:'Iron Edge',      description:'Base attack damage +20%.',                   icon:'sword',    cost:{ ore:30, gold:15 },                    requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Sword Dash',     description:'Lunge forward dealing 1.5× melee damage.',  icon:'dash',     cost:{ ore:35, gold:18 },                    requires:'speed', x:70,  y:180 },
      { id:'ab2',    label:'Shield Aura',    description:'Block all damage for 1.5 s.',               icon:'shield',   cost:{ ore:35, gold:18 },                    requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Blade Storm',    description:'Spin hits all nearby enemies for 2× dmg.',  icon:'zap',      cost:{ gold:25, diamond:10 },                requires:'attack', x:430, y:180 },
      { id:'ab1t1',  label:'Swift Lunge',    description:'Dash distance +40%. Cooldown −0.5 s.',       icon:'dash',     cost:{ ore:55, gold:28 },                    requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Phantom Blade',  description:'Dash leaves a shockwave hitting all in path.',icon:'sparkles', cost:{ ore:80, gold:42, diamond:10 },       requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:'Reinforced Guard',description:'Shield duration +0.8 s. Cooldown −1 s.',   icon:'shield',   cost:{ ore:55, gold:28 },                    requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Counter Stance', description:'On shield expiry, reflect 30% damage back.', icon:'star',    cost:{ ore:80, gold:42, mana:22 },           requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Extended Whirl', description:'Hitbox radius +35%. Damage ×2.3.',           icon:'zap',     cost:{ gold:38, diamond:14 },                requires:'ab3',   x:470, y:115 },
      { id:'ab3t2',  label:'Death Spiral',   description:'Pulls enemies inward before the final hit.',  icon:'flame',   cost:{ ore:85, gold:50, diamond:18, mana:25 }, requires:'ab3t1', x:428, y:50  },
    ] as SkillNode[],
  },
  {
    id: 2,
    name: 'Scarlet Knight',
    class: 'Knight',
    description: 'An armored juggernaut clad in crimson steel. Charges headlong into battle with unwavering resolve.',
    stats: { power: 82, defense: 90, speed: 45 },
    color: 'from-violet-500/20 to-purple-700/10',
    accent: 'text-white',
    accentHex: '#a78bfa',
    border: 'border-violet-500/30',
    idleSprite: { src: '/heroes/Knight_3/Idle.png', frames: 4, frameWidth: 128, frameHeight: 128 },
    spriteX: 115, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Knight',          description:'Your armored core. Unlock nodes to evolve.',     icon:'root',     cost:{},                                    requires:null,    x:250, y:310 },
      { id:'shield', label:'Shield Time',     description:'Shield block duration +0.6 s.',                  icon:'shield',   cost:{ ore:30, gold:15 },                     requires:'root',  x:140, y:245 },
      { id:'attack', label:'Crimson Steel',   description:'Attack damage +20%. Charge stun +0.3 s.',        icon:'sword',    cost:{ ore:30, gold:15 },                     requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Crimson Charge',  description:'Charge through enemies with heavy knockback.',   icon:'dash',     cost:{ ore:40, gold:20 },                     requires:'shield', x:70,  y:180 },
      { id:'ab2',    label:'Iron Bulwark',    description:'Reduce incoming damage by 70% while raised.',   icon:'shield',   cost:{ ore:40, gold:20 },                     requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Rally Cry',       description:'Boost attack speed by 50% for 4 s.',            icon:'flame',    cost:{ gold:30, mana:15 },                    requires:'attack', x:430, y:180 },
      { id:'ab1t1',  label:'Warpath',         description:'Charge speed +25%. Stun duration +0.5 s.',      icon:'dash',     cost:{ ore:70, gold:35 },                     requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Unstoppable',     description:'Charge breaks shields. Below 30% HP = instant kill.', icon:'star', cost:{ ore:95, gold:48, diamond:12 },      requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:'Fortified Wall',  description:'Damage reduction → 90%. Covers nearby allies.', icon:'shield',  cost:{ ore:70, gold:35 },                     requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Living Fortress', description:'Heals 15 HP/s while Bulwark is active.',        icon:'sparkles', cost:{ ore:95, gold:50, mana:28 },          requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Battle Hymn',     description:'Duration → 6 s. Applies to nearby allies.',     icon:'flame',    cost:{ gold:45, mana:22 },                    requires:'ab3',   x:470, y:108 },
      { id:'ab3t2',  label:'Crimson Fury',    description:'Also +40% damage & restores 25 HP on cast.',   icon:'star',     cost:{ ore:85, gold:52, diamond:14, mana:32 }, requires:'ab3t1', x:428, y:46  },
    ] as SkillNode[],
  },
  {
    id: 3,
    name: 'Storm Caller',
    class: 'Mage',
    description: 'Wields the raw power of the storm. Devastates entire lobbies with arcane fury.',
    stats: { power: 98, defense: 35, speed: 62 },
    color: 'from-amber-500/20 to-orange-600/10',
    accent: 'text-amber-400',
    accentHex: '#fbbf24',
    border: 'border-amber-500/30',
    idleSprite: { src: '/heroes/Lightning Mage/Idle.png', frames: 7, frameWidth: 128, frameHeight: 128 },
    spriteX: 35, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Storm Caller',   description:'Your arcane core. Unlock nodes to evolve.',       icon:'root',     cost:{},                                    requires:null,    x:250, y:310 },
      { id:'cdr',    label:'Spell Haste',    description:'All spell cooldowns −12%.',                        icon:'clock',    cost:{ mana:30, gold:15 },                    requires:'root',  x:140, y:245 },
      { id:'attack', label:'Arcane Power',   description:'Spell damage +18%.',                               icon:'sparkles', cost:{ mana:30, gold:15 },                    requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Chain Lightning',description:'Strike 3 enemies with arcing bolts.',             icon:'zap',      cost:{ mana:35, gold:18 },                    requires:'cdr',   x:70,  y:180 },
      { id:'ab2',    label:'Arcane Surge',   description:'Next 3 spells deal double damage.',                icon:'star',     cost:{ mana:35, ore:20 },                     requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Tempest',        description:'Summon a storm vortex for 5 s.',                   icon:'wind',     cost:{ mana:40, gold:25 },                    requires:'attack', x:430, y:180 },
      { id:'ab1t1',  label:'Fork Storm',     description:'Chains to 5 enemies. Damage +20%.',                icon:'zap',      cost:{ mana:55, gold:28 },                    requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Thunderclap',    description:'Final chain creates AOE stun burst.',              icon:'flame',    cost:{ mana:80, gold:45, diamond:12 },        requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:'Mana Overload',  description:'Applies to 5 spells. +15% cast speed.',           icon:'star',     cost:{ mana:55, ore:30 },                     requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Arcane Collapse',description:'Surge expiry knocks back all nearby foes.',      icon:'sparkles', cost:{ mana:85, ore:45, diamond:14 },         requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Cyclone',        description:'Duration +3 s. Vortex pulls enemies inward.',     icon:'wind',     cost:{ mana:58, gold:32 },                    requires:'ab3',   x:470, y:108 },
      { id:'ab3t2',  label:'Eye of Chaos',   description:'Enemies inside take 3× damage, −50% speed.',     icon:'flame',    cost:{ mana:90, gold:55, diamond:16, ore:30 }, requires:'ab3t1', x:428, y:46  },
    ] as SkillNode[],
  },
  {
    id: 4,
    name: 'Gold Keeper',
    class: 'Berserker',
    description: 'A raging titan who trades caution for raw destruction. The more damage taken, the harder the strikes.',
    stats: { power: 95, defense: 40, speed: 70 },
    color: 'from-emerald-500/20 to-teal-600/10',
    accent: 'text-emerald-400',
    accentHex: '#34d399',
    border: 'border-emerald-500/30',
    idleSprite: { src: '/heroes/Minotaur_1/Idle.png', frames: 10, frameWidth: 128, frameHeight: 128 },
    spriteScale: 195, spriteX: 20, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Gold Keeper',    description:'Your berserker core. Unlock nodes to evolve.',   icon:'root',     cost:{},                                     requires:null,    x:250, y:310 },
      { id:'attack', label:'Titan Fists',    description:'Melee damage +22%.',                             icon:'sword',    cost:{ ore:30, gold:15 },                     requires:'root',  x:140, y:245 },
      { id:'speed',  label:'Charge Speed',   description:'Movement speed +15%. Rage triggers faster.',    icon:'wind',     cost:{ ore:30, gold:15 },                     requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Earthshatter',   description:'Slam the ground. AOE damage + slow.',           icon:'flame',    cost:{ ore:45, gold:20 },                     requires:'attack', x:70,  y:180 },
      { id:'ab2',    label:'Blood Frenzy',   description:'2× attack speed when below 40% HP.',            icon:'zap',      cost:{ ore:40, gold:20 },                     requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Rage',           description:'Berserk state for 6 s. Ignores all CC.',        icon:'star',     cost:{ ore:40, gold:25 },                     requires:'speed', x:430, y:180 },
      { id:'ab1t1',  label:'Seismic Wave',   description:'Shockwave radius +50%. Slow duration +1 s.',    icon:'flame',    cost:{ ore:72, gold:35 },                     requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Magma Core',     description:'Impact zone ignites — 4 s burn damage.',        icon:'sparkles', cost:{ ore:100, gold:50, diamond:14 },        requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:'Bloodlust',      description:'Triggers at 55% HP. +20% lifesteal.',           icon:'zap',      cost:{ ore:68, gold:35 },                     requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Berserker God',  description:'Below 25% HP: invincible 2 s, deal 3× dmg.',   icon:'star',     cost:{ ore:95, gold:50, mana:28 },            requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Primal Fury',    description:'Duration +4 s. Movement speed +25%.',           icon:'star',     cost:{ ore:68, gold:32 },                     requires:'ab3',   x:470, y:108 },
      { id:'ab3t2',  label:"Titan's Wrath",  description:'Rage heals 5 HP/s and grants 50% dmg reduction.',icon:'sparkles', cost:{ ore:95, gold:55, diamond:16, mana:22 }, requires:'ab3t1', x:428, y:46  },
    ] as SkillNode[],
  },
  {
    id: 5,
    name: 'Foolish Peon',
    class: 'Jester',
    description: 'A chaotic trickster who confounds foes with wild antics. Unpredictable and dangerously lucky.',
    stats: { power: 60, defense: 30, speed: 95 },
    color: 'from-red-500/20 to-rose-700/10',
    accent: 'text-red-400',
    accentHex: '#f87171',
    border: 'border-red-500/30',
    idleSprite: { src: '/heroes/Ninja_Peasant/Idle.png', frames: 6, frameWidth: 96, frameHeight: 96 },
    spriteScale: 195, spriteX: 10, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Peon',           description:'Your jester core. Unlock nodes to evolve.',     icon:'root',     cost:{},                                     requires:null,    x:250, y:310 },
      { id:'dash',   label:'Longer Dash',    description:'Dash length +35%. Recharge −0.4 s.',            icon:'dash',     cost:{ ore:25, gold:12 },                     requires:'root',  x:140, y:245 },
      { id:'speed',  label:'Slippery Feet',  description:'Movement speed +20%. Hard to pin down.',        icon:'wind',     cost:{ ore:25, gold:12 },                     requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Juggle Blades',  description:'Throw 3 random blades bouncing between enemies.',icon:'zap',     cost:{ ore:30, gold:15 },                     requires:'dash',  x:70,  y:180 },
      { id:'ab2',    label:'Pratfall Trap',  description:'Place a trap that stuns the first enemy.',      icon:'star',     cost:{ gold:20, ore:25 },                     requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Wild Card',      description:'Randomly activates one of 5 powerful effects.', icon:'sparkles', cost:{ mana:25, gold:20 },                   requires:'speed', x:430, y:180 },
      { id:'ab1t1',  label:'Blade Circus',   description:'Throws 5 blades, each +15% damage.',           icon:'zap',      cost:{ ore:52, gold:28 },                     requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Perfect Chaos',  description:'25% chance per blade to crit for 5× damage.',  icon:'flame',    cost:{ ore:75, gold:42, diamond:10 },         requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:'Tripwire Net',   description:'Place 2 traps at once. Stun +0.5 s.',          icon:'star',     cost:{ gold:35, ore:30 },                     requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Exploding Banana',description:'Trap explodes on trigger, AOE damage.',       icon:'sparkles', cost:{ ore:68, gold:42, mana:22 },            requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Loaded Deck',    description:'Only draws from the 3 best effects.',          icon:'sparkles', cost:{ mana:42, gold:28 },                    requires:'ab3',   x:470, y:108 },
      { id:'ab3t2',  label:'House Wins',     description:'Wild Card activates twice in quick succession.',icon:'star',     cost:{ mana:68, gold:50, diamond:14, ore:32 }, requires:'ab3t1', x:428, y:46  },
    ] as SkillNode[],
  },
  {
    id: 6,
    name: 'Lone Nomad',
    class: 'Rogue',
    description: 'A drifter who strikes from the shadows, vanishing before the dust settles. Silence is the deadliest weapon.',
    stats: { power: 78, defense: 48, speed: 92 },
    color: 'from-slate-500/20 to-gray-700/10',
    accent: 'text-slate-300',
    accentHex: '#cbd5e1',
    border: 'border-slate-500/30',
    idleSprite: { src: '/heroes/Wanderer Magican/Idle.png', frames: 8, frameWidth: 128, frameHeight: 128 },
    spriteX: 10, spriteY: 0,
    skillNodes: [
      { id:'root',   label:'Nomad',          description:'Your rogue core. Unlock nodes to evolve.',      icon:'root',     cost:{},                                      requires:null,    x:250, y:310 },
      { id:'cdr',    label:'Quick Hands',    description:'Ability cooldowns −15%.',                       icon:'clock',    cost:{ mana:28, ore:18 },                      requires:'root',  x:140, y:245 },
      { id:'dash',   label:'Shadow Dash',    description:'Dash teleports instead — ignore terrain.',      icon:'dash',     cost:{ mana:28, ore:18 },                      requires:'root',  x:360, y:245 },
      { id:'ab1',    label:'Shadow Step',    description:'Teleport behind target and 2× backstab.',       icon:'dash',     cost:{ ore:30, mana:20 },                      requires:'cdr',   x:70,  y:180 },
      { id:'ab2',    label:'Poison Blade',   description:'Coat blade in poison — 8 dmg/s for 5 s.',      icon:'flame',    cost:{ mana:25, gold:15 },                     requires:'root',  x:250, y:180 },
      { id:'ab3',    label:'Vanishing Act',  description:'Invisible for 3 s. Next attack = crit.',       icon:'sparkles', cost:{ mana:30, ore:20 },                      requires:'dash',  x:430, y:180 },
      { id:'ab1t1',  label:'Ghost Walk',     description:'1 s invisibility on entry. Damage ×2.5.',       icon:'sparkles', cost:{ ore:52, mana:32 },                      requires:'ab1',   x:30,  y:115 },
      { id:'ab1t2',  label:'Void Strike',    description:'Backstab silences target for 2 s.',             icon:'zap',      cost:{ ore:78, mana:50, diamond:12 },          requires:'ab1t1', x:72,  y:50  },
      { id:'ab2t1',  label:"Viper's Edge",   description:'Poison damage →12/s. Duration +3 s.',          icon:'flame',    cost:{ mana:42, gold:25 },                     requires:'ab2',   x:250, y:115 },
      { id:'ab2t2',  label:'Neurotoxin',     description:'Poisoned enemies −40% speed. Drop healing orbs.',icon:'star',    cost:{ mana:72, gold:40, diamond:12, ore:22 }, requires:'ab2t1', x:250, y:50  },
      { id:'ab3t1',  label:'Smoke Screen',   description:'Invisibility +2 s. Leaves slowing smoke cloud.',icon:'wind',    cost:{ mana:48, ore:28 },                      requires:'ab3',   x:470, y:108 },
      { id:'ab3t2',  label:'Phantom Protocol',description:'Can attack twice before breaking stealth.',   icon:'sparkles', cost:{ mana:75, ore:50, diamond:14, gold:28 }, requires:'ab3t1', x:428, y:46  },
    ] as SkillNode[],
  },
];

/* ── Upgrade storage ── */
const UPGRADES_KEY = 'stakeclash_hero_upgrades_v2';
type UpgradeState = Record<number, string[]>; // heroId → array of unlocked node ids

function loadUpgrades(): UpgradeState {
  try { return JSON.parse(localStorage.getItem(UPGRADES_KEY) ?? '{}'); } catch { return {}; }
}
function saveUpgrades(s: UpgradeState) {
  localStorage.setItem(UPGRADES_KEY, JSON.stringify(s));
}

/* ── Resource cost display ── */
const CostRow = ({ cost, canAfford }: { cost: ResourceCost; canAfford: boolean }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {(Object.entries(cost) as [string, number][]).map(([res, amt]) => (
      <div key={res} className={cn('flex items-center gap-1 text-[11px] font-mono', canAfford ? 'text-emerald-400' : 'text-rose-400')}>
        <img src={RES_ICONS[res]} alt={res} className="w-3.5 h-3.5 object-contain" />
        {amt}
      </div>
    ))}
  </div>
);

/* ── Visual Skill Tree Modal ── */
const CANVAS_W = 500;
const CANVAS_H = 350;
const NODE_R   = 22;

function SkillTreeModal({
  hero,
  resources,
  onSpend,
  onClose,
}: {
  hero: typeof heroes[0];
  resources: { ore: number; gold: number; diamond: number; mana: number };
  onSpend: (cost: ResourceCost) => void;
  onClose: () => void;
}) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    const s = loadUpgrades();
    return s[hero.id] ?? [];
  });
  const [selected, setSelected] = useState<SkillNode | null>(null);

  const isUnlocked = (id: string) => id === 'root' || unlockedIds.includes(id);

  function canAfford(cost: ResourceCost) {
    return (
      (cost.ore     ?? 0) <= resources.ore     &&
      (cost.gold    ?? 0) <= resources.gold    &&
      (cost.diamond ?? 0) <= resources.diamond &&
      (cost.mana    ?? 0) <= resources.mana
    );
  }

  function isAvailable(node: SkillNode) {
    if (isUnlocked(node.id) || node.id === 'root') return false;
    return node.requires === null || isUnlocked(node.requires);
  }

  function handleUnlock() {
    if (!selected || !isAvailable(selected) || !canAfford(selected.cost)) return;
    const next = [...unlockedIds, selected.id];
    setUnlockedIds(next);
    const allUps = loadUpgrades();
    saveUpgrades({ ...allUps, [hero.id]: next });
    onSpend(selected.cost);
  }

  // Lines between all connected nodes including root → children
  const lines = (hero.skillNodes as SkillNode[])
    .filter(n => n.requires !== null)
    .map(n => {
      const parent = (hero.skillNodes as SkillNode[]).find(p => p.id === n.requires);
      if (!parent) return null;
      const dx = n.x - parent.x, dy = n.y - parent.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / len, uy = dy / len;
      const pR = parent.id === 'root' ? NODE_R * 1.3 : NODE_R;
      const cR = n.id      === 'root' ? NODE_R * 1.3 : NODE_R;
      const active = isUnlocked(n.requires!) && isUnlocked(n.id);
      const parentUnlocked = isUnlocked(n.requires!);
      return {
        x1: parent.x + ux * pR, y1: parent.y + uy * pR,
        x2: n.x      - ux * cR, y2: n.y      - uy * cR,
        active, parentUnlocked,
      };
    })
    .filter(Boolean) as { x1:number; y1:number; x2:number; y2:number; active:boolean; parentUnlocked:boolean }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl p-4"
        style={{
          background: 'rgba(4,4,14,0.98)',
          border: `1px solid ${hero.accentHex}55`,
          boxShadow: `0 0 80px ${hero.accentHex}20`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5" style={{ color: hero.accentHex }} />
              {hero.name} — Skill Tree
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: `${hero.accentHex}22`, color: hero.accentHex }}>
                {unlockedIds.length}/{hero.skillNodes.length - 1}
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Click a node · Unlock with resources</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resource balance */}
        <div className="flex items-center gap-3 mb-2.5 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['ore','gold','diamond','mana'] as const).map(r => (
            <div key={r} className="flex items-center gap-1 text-xs font-mono">
              <img src={RES_ICONS[r]} alt={r} className="w-3 h-3 object-contain" />
              <span>{Math.floor(resources[r])}</span>
            </div>
          ))}
          <span className="ml-auto text-[9px] text-muted-foreground uppercase tracking-wide">Balance</span>
        </div>

        {/* Tree canvas — full width, no overflow scroll */}
        <div className="rounded-xl w-full"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="relative w-full" style={{ paddingBottom: `${(CANVAS_H / CANVAS_W) * 100}%` }}>
            <div className="absolute inset-0">

              {/* SVG lines — rendered first so node circles sit on top */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet"
                style={{ overflow: 'visible' }}>
                {lines.map((l, i) => (
                  <line key={i}
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke={l.active ? hero.accentHex : l.parentUnlocked ? `${hero.accentHex}cc` : `${hero.accentHex}66`}
                    strokeWidth={4}
                    strokeLinecap="round"
                    opacity={1}
                  />
                ))}
              </svg>

              {/* Nodes */}
              {(hero.skillNodes as SkillNode[]).map(node => {
                const Icon      = NODE_ICON_MAP[node.icon] ?? Zap;
                const unlocked  = isUnlocked(node.id);
                const available = isAvailable(node);
                const isRoot    = node.id === 'root';
                const isSel     = selected?.id === node.id;

                const nodeR = isRoot ? NODE_R * 1.3 : NODE_R;
                const leftPct = `${(node.x - nodeR) / CANVAS_W * 100}%`;
                const topPct  = `${(node.y - nodeR) / CANVAS_H * 100}%`;

                return (
                  <div key={node.id}
                    onClick={() => !isRoot && setSelected(isSel ? null : node)}
                    className={cn(
                      'absolute flex items-center justify-center rounded-full transition-all duration-200',
                      !isRoot && 'cursor-pointer',
                      !isRoot && available && !unlocked && 'hover:scale-110',
                      !isRoot && !unlocked && !available && 'opacity-45',
                    )}
                    style={{
                      width:  `${nodeR * 2 / CANVAS_W * 100}%`,
                      height: 0,
                      paddingBottom: `${nodeR * 2 / CANVAS_W * 100}%`,
                      left: leftPct, top: topPct,
                    }}
                  >
                    {/* inner circle */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{
                        background: isRoot
                          ? `radial-gradient(circle, ${hero.accentHex}55 0%, ${hero.accentHex}22 100%)`
                          : unlocked
                            ? `radial-gradient(circle, ${hero.accentHex}45 0%, ${hero.accentHex}18 100%)`
                            : available
                              ? `${hero.accentHex}12`
                              : 'rgba(255,255,255,0.04)',
                        border: `${isRoot ? 3 : 2.5}px solid ${isRoot ? hero.accentHex : isSel ? hero.accentHex : unlocked ? hero.accentHex : available ? hero.accentHex + '88' : 'rgba(255,255,255,0.22)'}`,
                        boxShadow: isRoot
                          ? `0 0 24px ${hero.accentHex}80, 0 0 10px ${hero.accentHex}60`
                          : unlocked
                            ? `0 0 18px ${hero.accentHex}70, 0 0 7px ${hero.accentHex}55`
                            : isSel
                              ? `0 0 14px ${hero.accentHex}55`
                              : available
                                ? `0 0 8px ${hero.accentHex}30`
                                : 'none',
                      }}
                    >
                      {isRoot
                        ? <span className="text-[9px] font-bold tracking-wide" style={{ color: hero.accentHex }}>{hero.class}</span>
                        : <Icon style={{
                            width: '38%', height: '38%',
                            color: unlocked ? hero.accentHex : available ? `${hero.accentHex}cc` : 'rgba(255,255,255,0.3)',
                          }} />
                      }
                    </div>
                    {/* Label below */}
                    <div className="absolute text-center pointer-events-none"
                      style={{ top: '105%', width: 72, left: '50%', transform: 'translateX(-50%)' }}>
                      <span className="text-[8.5px] leading-tight font-medium whitespace-nowrap"
                        style={{ color: unlocked ? 'rgba(255,255,255,0.7)' : available ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                        {node.label}
                      </span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>

        {/* Info + unlock panel */}
        <div className="mt-2.5 rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 64 }}>
          {selected ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${hero.accentHex}25`, border: `1.5px solid ${hero.accentHex}66` }}>
                {(() => { const Icon = NODE_ICON_MAP[selected.icon] ?? Zap; return <Icon className="w-3.5 h-3.5" style={{ color: hero.accentHex }} />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{selected.label}</p>
                  {isUnlocked(selected.id) && (
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Active</span>
                  )}
                  {!isUnlocked(selected.id) && !isAvailable(selected) && (
                    <span className="text-[9px] bg-white/5 text-muted-foreground/50 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Locked</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{selected.description}</p>
                {!isUnlocked(selected.id) && isAvailable(selected) && (
                  <div className="flex items-center gap-3 mt-1">
                    <CostRow cost={selected.cost} canAfford={canAfford(selected.cost)} />
                  </div>
                )}
                {!isUnlocked(selected.id) && !isAvailable(selected) && selected.requires && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Requires: <span className="text-muted-foreground/70">
                      {(hero.skillNodes as SkillNode[]).find(n => n.id === selected.requires)?.label}
                    </span>
                  </p>
                )}
              </div>
              {!isUnlocked(selected.id) && isAvailable(selected) && (
                <button onClick={handleUnlock} disabled={!canAfford(selected.cost)}
                  className={cn(
                    'flex-shrink-0 self-center text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all',
                    canAfford(selected.cost) ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-50'
                  )}
                  style={canAfford(selected.cost) ? {
                    borderColor: `${hero.accentHex}88`, color: hero.accentHex, background: `${hero.accentHex}18`,
                  } : {
                    borderColor: 'rgba(239,68,68,0.35)', color: 'rgba(239,68,68,0.55)', background: 'transparent',
                  }}
                >
                  {canAfford(selected.cost) ? 'UNLOCK' : 'NO FUNDS'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/40 text-center" style={{ paddingTop: 10 }}>
              Click any node to inspect
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Stat bar ── */
const statIcons: Record<string, React.ReactNode> = {
  power: <Swords className="w-3 h-3" />,
  defense: <Shield className="w-3 h-3" />,
  speed: <Wind className="w-3 h-3" />,
};

const StatBar = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {statIcons[label]}
        <span className="capitalize">{label}</span>
      </div>
      <span className={cn('text-xs font-mono font-medium', accent)}>{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: `linear-gradient(90deg, hsl(185 100% 50% / 0.5), hsl(185 100% 50%))` }} />
    </div>
  </div>
);

/* ── Page ── */
const Hero = () => {
  const [selectedHero, setSelectedHero] = useState(heroes[0]);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const navigate = useNavigate();
  const wallet = useWalletContext();
  const player = usePlayerData(wallet?.address ?? null);

  // local resource state mirrored from player data (Fortress generates resources,
  // we track them here as the "spendable" pool stored via usePlayerData indirectly)
  const [resources, setResources] = useState({ ore: 0, gold: 0, diamond: 0, mana: 0 });

  // Sync resources from player data on load
  useEffect(() => {
    const key = `stakeclash_hero_resources_${wallet?.address?.toLowerCase() ?? 'guest'}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setResources(JSON.parse(raw));
      else setResources({ ore: 120, gold: 70, diamond: 24, mana: 48 }); // starter balance
    } catch { setResources({ ore: 120, gold: 70, diamond: 24, mana: 48 }); }
  }, [wallet?.address]);

  function saveResources(r: typeof resources) {
    const key = `stakeclash_hero_resources_${wallet?.address?.toLowerCase() ?? 'guest'}`;
    localStorage.setItem(key, JSON.stringify(r));
  }

  function handleSpend(cost: ResourceCost) {
    setResources(prev => {
      const next = {
        ore:     prev.ore     - (cost.ore     ?? 0),
        gold:    prev.gold    - (cost.gold    ?? 0),
        diamond: prev.diamond - (cost.diamond ?? 0),
        mana:    prev.mana    - (cost.mana    ?? 0),
      };
      saveResources(next);
      return next;
    });
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      {showSkillTree && (
        <SkillTreeModal
          hero={selectedHero}
          resources={resources}
          onSpend={handleSpend}
          onClose={() => setShowSkillTree(false)}
        />
      )}

      <main className="relative z-10 flex-1 flex flex-col pt-20 pb-3 min-h-0">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col flex-1 min-h-0">

          <div className="mb-3 flex-shrink-0">
            <h1 className="text-2xl font-bold mb-0.5">Hero</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 flex-1 min-h-0">

            {/* Hero Grid */}
            <div className="lg:col-span-2 min-h-0">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
                {heroes.map((hero) => (
                  <button
                    key={hero.id}
                    data-hero-id={hero.id}
                    onClick={() => setSelectedHero(hero)}
                    className={cn(
                      'relative text-left rounded-xl border p-2 transition-all duration-200 group w-full flex flex-col min-h-0 overflow-hidden',
                      'bg-gradient-to-br', hero.color,
                      selectedHero.id === hero.id
                        ? cn(hero.border, 'shadow-lg scale-[1.02]')
                        : 'border-border/40 hover:border-border hover:scale-[1.01]'
                    )}
                  >
                    {selectedHero.id === hero.id && (
                      <div className="absolute inset-0 rounded-xl ring-1 ring-inset pointer-events-none ring-cyan-400/30" />
                    )}
                    <div className="flex-1 min-h-0 flex items-end justify-center"
                      style={{ transform: `translate(${hero.spriteX ?? 0}px, ${hero.spriteY ?? 0}px)` }}>
                      {hero.idleSprite ? (
                        <AnimatedSprite
                          src={hero.idleSprite.src}
                          frames={hero.idleSprite.frames}
                          frameWidth={hero.idleSprite.frameWidth}
                          frameHeight={hero.idleSprite.frameHeight}
                          size={(hero as { spriteScale?: number }).spriteScale ?? 250}
                        />
                      ) : (
                        <Shield className={cn('w-12 h-12 opacity-20 group-hover:opacity-30 transition-opacity', hero.accent)} />
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5 flex-shrink-0 text-center w-full">{hero.name}</h3>
                    <p className={cn('text-xs font-medium text-center w-full', hero.accent)}>{hero.class}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="min-h-0 overflow-y-auto fortress-sidebar">
              <div className={cn('card-surface-elevated p-5 rounded-xl border', selectedHero.border)}>
                <div className="mb-2">
                  <h2 className="text-lg font-bold">{selectedHero.name}</h2>
                  <p className={cn('text-sm font-medium', selectedHero.accent)}>{selectedHero.class}</p>
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {selectedHero.description}
                </p>

                {/* Stats */}
                <div className="space-y-2.5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stats</p>
                  {Object.entries(selectedHero.stats).map(([key, val]) => (
                    <StatBar key={key} label={key} value={val} accent={selectedHero.accent} />
                  ))}
                </div>

                {/* Skill Tree button */}
                <button
                  onClick={() => setShowSkillTree(true)}
                  className={cn(
                    'w-full mb-3 flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                    'hover:scale-[1.01] active:scale-[0.99]',
                  )}
                  style={{
                    borderColor: `${selectedHero.accentHex}44`,
                    background: `${selectedHero.accentHex}0d`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" style={{ color: selectedHero.accentHex }} />
                    <span className="text-sm font-semibold">Skill Tree</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: selectedHero.accentHex }}>
                      {(loadUpgrades()[selectedHero.id] ?? []).length}/{selectedHero.skillNodes.length - 1}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {/* CTA */}
                <Button
                  className="w-full btn-cyan-gradient gap-2"
                  onClick={() => { if (selectedHero.id === 1) navigate('/clash'); }}
                >
                  <Swords className="w-4 h-4" />
                  Select {selectedHero.name}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Hero;
