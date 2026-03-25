import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import JobView from "@/pages/JobView";
import { Sidebar } from "@/components/Sidebar";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/job/:jobId" component={JobView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="app-shell flex h-screen overflow-hidden font-sans">
            <Sidebar />

            <main className="relative flex-1 overflow-y-auto">
              <div className="aurora-orb left-[15%] top-20 h-64 w-64 bg-primary/10" />
              <div className="aurora-orb right-[10%] top-64 h-80 w-80 bg-white/5 [animation-delay:1.5s]" />
              <div className="aurora-orb bottom-20 left-1/3 h-72 w-72 bg-primary/10 -translate-x-1/2 [animation-delay:2s]" />
              <Router />
            </main>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
