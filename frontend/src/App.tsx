import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Overview from "./pages/Overview";
import LiveMonitoring from "./pages/LiveMonitoring";
import MineMap from "./pages/MineMap";
import AIAnalysis from "./pages/AIAnalysis";
import Alerts from "./pages/Alerts";
import SensorNetwork from "./pages/SensorNetwork";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { useSensorData } from "./hooks/useSensorData";
import { SensorDataProvider } from "./hooks/SensorDataContext";
import BackgroundVideo from "./components/BackgroundVideo";
import LandingPage from "./pages/LandingPage";
import MLSimulator from "./pages/MLSimulator";

type Page = "overview" | "monitoring" | "map" | "ai" | "simulator" | "alerts" | "sensors" | "analytics" | "reports" | "settings";
const PAGE_ROUTES: Record<Page, string> = {
  overview: "/dashboard",
  monitoring: "/monitoring",
  map: "/map",
  ai: "/ai-analysis",
  simulator: "/ml-simulator",
  alerts: "/alerts",
  sensors: "/sensor-network",
  analytics: "/analytics",
  reports: "/reports",
  settings: "/settings",
};
const ROUTE_PAGES: Record<string, Page> = {
  "/dashboard": "overview",
  "/overview": "overview",
  "/monitoring": "monitoring",
  "/live-monitoring": "monitoring",
  "/map": "map",
  "/mine-map": "map",
  "/ai": "ai",
  "/ai-analysis": "ai",
  "/ml-simulator": "simulator",
  "/alerts": "alerts",
  "/sensors": "sensors",
  "/sensor-network": "sensors",
  "/analytics": "analytics",
  "/reports": "reports",
  "/settings": "settings",
};

const PAGES: Record<Page, React.ComponentType> = {
  overview: Overview,
  monitoring: LiveMonitoring,
  map: MineMap,
  ai: AIAnalysis,
  simulator: MLSimulator,
  alerts: Alerts,
  sensors: SensorNetwork,
  analytics: Analytics,
  reports: Reports,
  settings: Settings,
};

function DashboardApp({ page, onNavigate }: { page: Page; onNavigate: (path: string) => void }) {
  const data = useSensorData();
  const PageComponent = PAGES[page];

  return (
    <SensorDataProvider data={data}>
      <div style={{ display: "flex", height: "100vh", background: "transparent", overflow: "hidden" }}>
        <Sidebar
          current={page}
          onChange={(nextPage) => onNavigate(PAGE_ROUTES[nextPage])}
          alertCount={data.risk?.alert ? 1 : 0}
          backendOnline={data.backendOnline}
          dataStatus={data.status}
          lastSyncAgo={data.lastSyncAgo}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Header
            status={data.status}
            latest={data.latest}
            alertCount={data.risk?.alert ? 1 : 0}
            lastSyncAgo={data.lastSyncAgo}
          />
          <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <PageComponent />
          </main>
        </div>
      </div>
    </SensorDataProvider>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname.toLowerCase());
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const isLandingPage = normalizedPath === "/" || normalizedPath === "/index.html";
  const page = ROUTE_PAGES[normalizedPath] ?? "overview";

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname.toLowerCase());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(window.location.pathname.toLowerCase());
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-root">
      <BackgroundVideo />
      <div className="app-route-content">
        {isLandingPage ? <LandingPage onNavigate={navigate} /> : <DashboardApp page={page} onNavigate={navigate} />}
      </div>
    </div>
  );
}
