import { useState } from "react";
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

type Page = "overview" | "monitoring" | "map" | "ai" | "alerts" | "sensors" | "analytics" | "reports" | "settings";
const PAGES: Record<Page, React.ComponentType> = {
  overview: Overview,
  monitoring: LiveMonitoring,
  map: MineMap,
  ai: AIAnalysis,
  alerts: Alerts,
  sensors: SensorNetwork,
  analytics: Analytics,
  reports: Reports,
  settings: Settings,
};

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const data = useSensorData();
  const PageComponent = PAGES[page];

  return (
    <SensorDataProvider data={data}>
      <div style={{ display: "flex", height: "100vh", background: "#080D13", overflow: "hidden" }}>
        <Sidebar
          current={page}
          onChange={setPage}
          alertCount={data.risk?.alert ? 1 : 0}
          backendOnline={data.backendOnline}
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
