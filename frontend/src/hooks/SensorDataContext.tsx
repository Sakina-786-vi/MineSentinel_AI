import { createContext, useContext } from "react";
import { useSensorData } from "./useSensorData";

const SensorDataContext = createContext<ReturnType<typeof useSensorData> | null>(null);
export function SensorDataProvider({ data, children }: { data: ReturnType<typeof useSensorData>; children: React.ReactNode }) {
  return <SensorDataContext.Provider value={data}>{children}</SensorDataContext.Provider>;
}
export function useLiveSensorData() {
  const data = useContext(SensorDataContext);
  if (!data) throw new Error("useLiveSensorData must be used inside SensorDataProvider");
  return data;
}
