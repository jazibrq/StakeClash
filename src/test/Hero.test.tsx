import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* ── Mocks ─────────────────────────────────────────────────────── */

// Mock canvas getContext since jsdom doesn't support it
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

// Stub out components that rely on video / wallet / heavy DOM
vi.mock('@/components/VideoBackground', () => ({
  VideoBackground: () => <div data-testid="video-bg" />,
}));
vi.mock('@/components/GrainOverlay', () => ({
  GrainOverlay: () => <div data-testid="grain" />,
}));
vi.mock('@/components/Navigation', () => ({
  Navigation: () => <nav data-testid="nav" />,
}));

/* ── Import after mocks ── */
import Hero from '@/pages/Hero';

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('Hero page layout', () => {
  it('fits on a single page with no scrollbar (h-screen overflow-hidden)', () => {
    const { container } = renderHero();
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('h-screen');
    expect(root.className).toContain('overflow-hidden');
  });

  it('renders exactly 6 hero cards', () => {
    renderHero();
    const cards = document.querySelectorAll('[data-hero-id]');
    expect(cards.length).toBe(6);
  });

  it('all 6 hero cards have an animated sprite canvas', () => {
    renderHero();
    const cards = document.querySelectorAll('[data-hero-id]');
    cards.forEach((card) => {
      const canvas = card.querySelector('canvas.animated-sprite');
      expect(canvas).toBeTruthy();
    });
  });

  it('sprite canvases are rendered at expected size with 1.8x scale transform for large display', () => {
    renderHero();
    const canvases = document.querySelectorAll('canvas.animated-sprite');
    expect(canvases.length).toBe(6);
    canvases.forEach((c) => {
      const canvas = c as HTMLCanvasElement;
      const w = parseInt(canvas.getAttribute('width')!, 10);
      expect(w).toBeGreaterThanOrEqual(195);
      expect(canvas.style.transform).toBe('scale(1.8)');
      expect(canvas.style.transformOrigin).toBe('bottom center');
    });
  });

  it('sprite canvases use transform scale to fill box (no maxWidth shrink)', () => {
    renderHero();
    const canvas = document.querySelector('canvas.animated-sprite') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    expect(canvas.style.flexShrink).toBe('0');
    expect(canvas.style.transform).toContain('scale');
  });

  it('all hero sprite containers are centered (justify-center)', () => {
    renderHero();
    [1, 2, 3, 4, 5, 6].forEach((id) => {
      const card = document.querySelector(`[data-hero-id="${id}"]`)!;
      const spriteWrapper = card.querySelector('.flex-1') as HTMLElement;
      expect(spriteWrapper).toBeTruthy();
      expect(spriteWrapper.className).toContain('justify-center');
    });
  });

  it('hero cards are inside a 3×2 grid (gridTemplateRows 1fr 1fr)', () => {
    renderHero();
    const card = document.querySelector('[data-hero-id="1"]')!;
    const grid = card.parentElement as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-3');
    expect(grid.style.gridTemplateRows).toBe('1fr 1fr');
  });

  it('each hero card shows hero name and class', () => {
    renderHero();
    // Check that hero names appear (some appear twice — card + detail panel for selected hero)
    expect(screen.getAllByText('Samurai Commander').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Warrior').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Scarlet Knight')).toBeTruthy();
    expect(screen.getByText('Knight')).toBeTruthy();
    expect(screen.getByText('Lone Nomad')).toBeTruthy();
    expect(screen.getByText('Rogue')).toBeTruthy();
  });

  it('all hero cards use overflow-hidden so nothing is cut off outside the box', () => {
    renderHero();
    const cards = document.querySelectorAll('[data-hero-id]');
    cards.forEach((card) => {
      expect((card as HTMLElement).className).toContain('overflow-hidden');
    });
  });

  it('detail panel is present with selected hero info', () => {
    renderHero();
    // Default selected hero is Samurai Commander
    expect(screen.getByText('Sword Dash')).toBeTruthy();
    expect(screen.getByText('Shield Aura')).toBeTruthy();
    expect(screen.getByText('Blade Storm')).toBeTruthy();
  });
});
