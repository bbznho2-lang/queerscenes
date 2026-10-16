import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";
import Browse from "./pages/Browse";
import Player from "./pages/Player";
import Admin from "./pages/Admin";
import Catalog from "./pages/Catalog";
import TitlePage from "./pages/TitlePage";
import Wishlist from "./pages/Wishlist";
import ManageSubscription from "./pages/ManageSubscription";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { captureReferralFromUrl } from "@/lib/referral";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void captureReferralFromUrl();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/title/:slug" element={<TitlePage />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/manage-subscription" element={<ManageSubscription />} />
            <Route path="/player/:id" element={<Player />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
