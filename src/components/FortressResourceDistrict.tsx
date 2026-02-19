import React, { memo, useState } from 'react';

type Resource = 'ore' | 'gold' | 'diamond' | 'mana';
type Level = 1 | 2 | 3;

const resources: Resource[] = ['ore', 'gold', 'diamond', 'mana'];

/* ─── Individual resource panel (fills its grid cell) ──────────── */
const ResourcePanel = memo(({ resource }: { resource: Resource }) => {
  const [level, setLevel] = useState<Level>(1);
  const src = `/animations/${resource}${level}.mp4`;

  return (
    <div className="relative bg-black overflow-hidden w-full h-full">
      <video
        key={src}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Level dropdown — top-right */}
      <div className="absolute top-2 right-2 z-10">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as Level)}
          style={{
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            borderRadius: '6px',
            padding: '2px 22px 2px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 7px center',
          }}
        >
          <option value={1}>Lv 1</option>
          <option value={2}>Lv 2</option>
          <option value={3}>Lv 3</option>
        </select>
      </div>
    </div>
  );
});
ResourcePanel.displayName = 'ResourcePanel';

/* ─── 2×2 grid — fills its parent container ────────────────────── */
export const FortressResourceDistrict: React.FC = () => (
  <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-black">
    {resources.map((r) => (
      <ResourcePanel key={r} resource={r} />
    ))}
  </div>
);

export default FortressResourceDistrict;
