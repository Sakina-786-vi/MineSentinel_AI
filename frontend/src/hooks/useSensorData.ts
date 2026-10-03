import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Health, type Reading, type Risk } from "../services/api";

const POLL_MS = 500;
const HISTORY_LIMIT = 300;
const LIVE_READING_MAX_AGE_MS = 30_000;
const PHYSICAL_NODE_ID = "MS-1";
export function useSensorData() {
  const [nodes, setNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | undefined>(PHYSICAL_NODE_ID);
  const [latest, setLatest] = useState<Reading>();
  const [history, setHistory] = useState<Reading[]>([]);
  const [risk, setRisk] = useState<Risk>();
  const [health, setHealth] = useState<Health>();
  const [allNodesLatest, setAllNodesLatest] = useState<Reading[]>([]);
  const [allNodesRisk, setAllNodesRisk] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [backendOnline, setBackendOnline] = useState(false);
  const [readingStale, setReadingStale] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const requestSequence = useRef(0);
  const selectedNodeRef = useRef<string | undefined>(selectedNode);
  selectedNodeRef.current = selectedNode;

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    try {
      const [healthResp, latestResp, riskResp] = await Promise.all([
        api.health().catch(() => ({ status: "unknown", ai_available: false })),
        api.latest(),
        api.risk().catch(() => undefined),
      ]);
      if (sequence !== requestSequence.current) return;

      setHealth(healthResp);
      const readings = Array.isArray(latestResp) ? latestResp : [latestResp];
      const risks = riskResp ? (Array.isArray(riskResp) ? riskResp : [riskResp]) : [];
      const newest = [...readings].sort((a, b) => b.id - a.id)[0];
      const currentSelectedNode = selectedNodeRef.current;
      const activeNode = currentSelectedNode && readings.some(item => item.node_id === currentSelectedNode)
        ? currentSelectedNode
        : newest?.node_id;
      const reading = readings.find(item => item.node_id === activeNode);
      const riskData = risks.find(item => item.node_id === activeNode);
      const readingIsValid = Boolean(
        reading && Number.isFinite(new Date(reading.timestamp).getTime())
      );

      setNodes(readings.map(item => item.node_id).sort());
      setSelectedNode(activeNode);
      setAllNodesLatest(readings);
      setAllNodesRisk(risks);

      if (reading && readingIsValid) {
        const age = Date.now() - new Date(reading.received_at ?? reading.timestamp).getTime();
        setReadingStale(age > LIVE_READING_MAX_AGE_MS || age < -60_000);
        setLatest(previous => !previous || previous.node_id !== reading.node_id || reading.id >= previous.id ? reading : previous);
        setHistory(prev => {
          const exists = prev.some(item => item.id === reading.id || item.timestamp === reading.timestamp);
          if (exists) return prev;
          return [...prev, reading].slice(-HISTORY_LIMIT);
        });
      } else if (reading) {
        setReadingStale(true);
      } else {
        setReadingStale(true);
        setLatest(undefined);
        setHistory([]);
      }

      if (riskData && readingIsValid) {
        setRisk(riskData);
      } else {
        setRisk(undefined);
      }

      setError(reading && !readingIsValid ? "Backend returned a reading with an invalid timestamp; keeping the last valid reading." : undefined);
      setBackendOnline(true);
      lastFetchTime.current = Date.now();
    } catch (cause) {
      setBackendOnline(false);
      setReadingStale(true);
      setError(cause instanceof Error ? cause.message : "Backend unavailable");
      // Keep the last valid packet visible; status and error mark it unavailable/stale.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      await refresh();
      if (active) timer = window.setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (latest && latest.node_id !== selectedNode) {
      setLatest(undefined);
      setRisk(undefined);
      setHistory([]);
    }
    if (selectedNode) {
      api.history(selectedNode, HISTORY_LIMIT)
        .then(h => {
          if (!active || selectedNodeRef.current !== selectedNode) return;
          if (Array.isArray(h) && h.length > 0) {
            setHistory(prev => {
              const merged = [...h, ...prev]
                .filter((reading, index, all) => all.findIndex(item => item.id === reading.id || item.timestamp === reading.timestamp) === index)
                .sort((a, b) => a.id - b.id);
              return merged.slice(-HISTORY_LIMIT);
            });
            const newest = h[h.length - 1];
            if (newest) setLatest(previous => !previous || previous.node_id !== newest.node_id || newest.id >= previous.id ? newest : previous);
          }
      })
        .catch(() => undefined);
    } else {
      setHistory([]);
    }
    return () => { active = false; };
  }, [selectedNode]);

  const status = useMemo(() => {
    if (!backendOnline) return "OFFLINE";
    if (!latest) return "WAITING FOR DATA";
    return readingStale ? "STALE" : "LIVE";
  }, [backendOnline, readingStale, latest]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const lastSyncAgo = useMemo(() => {
    if (!lastFetchTime.current) return "—";
    const sec = Math.round((Date.now() - lastFetchTime.current) / 1000);
    if (sec < 2) return "just now";
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }, [lastFetchTime.current, status]);

  return {
    nodes,
    selectedNode,
    setSelectedNode,
    latest,
    history,
    risk,
    health,
    allNodesLatest,
    allNodesRisk,
    loading,
    error,
    backendOnline,
    status,
    lastSyncAgo,
    refresh,
  };
}
