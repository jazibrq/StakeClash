import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Fortress from "./pages/Fortress";
import Clash from "./pages/Clash";
import Learn from "./pages/Learn";
import Hero from "./pages/Hero";
import NotFound from "./pages/NotFound";
import { WalletProvider } from "./contexts/WalletContext";

const queryClient = new QueryClient();

/* Module-level singletons to preserve playback position between routes */
const ghostMusic = new Audio("/audio/ghost.mp3");
ghostMusic.loop = true;
ghostMusic.volume = 0.4;

const reckoningMusic = new Audio("/audio/reckoning.mp3");
reckoningMusic.loop = true;
reckoningMusic.volume = 0.5;

const RouteAudioManager = () => {
  const { pathname } = useLocation();
  const isClash = pathname.startsWith("/clash");

  useEffect(() => {
    const active = isClash ? reckoningMusic : ghostMusic;
    const inactive = isClash ? ghostMusic : reckoningMusic;

    inactive.pause();

    let cleaned = false;
    const resume = () => {
      if (cleaned) return;
      active.play().catch(() => {});
    };

    active.play().catch(() => {
      window.addEventListener("pointerdown", resume, { once: true });
      window.addEventListener("keydown", resume, { once: true });
      window.addEventListener("touchstart", resume, { once: true });
    });

    return () => {
      cleaned = true;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("touchstart", resume);
    };
  }, [isClash]);

  useEffect(() => {
    return () => {
      ghostMusic.pause();
      reckoningMusic.pause();
    };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteAudioManager />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fortress" element={<Fortress />} />
          <Route path="/clash" element={<Clash />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/hero" element={<Hero />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
