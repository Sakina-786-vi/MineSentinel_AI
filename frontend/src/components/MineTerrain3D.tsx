import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Minus, Move3d, Pause, Play, Plus, RotateCcw } from "lucide-react";
import type { MapNode } from "./GISMap";

const WIDTH = 680;
const HEIGHT = 380;

const RISK_STYLES = {
  normal: { color: "#32D583", glow: "rgba(50, 213, 131, 0.75)", label: "NORMAL" },
  warning: { color: "#F5C451", glow: "rgba(245, 196, 81, 0.75)", label: "WARNING" },
  high: { color: "#F28C38", glow: "rgba(242, 140, 56, 0.8)", label: "HIGH" },
  critical: { color: "#FF4D5A", glow: "rgba(255, 77, 90, 0.85)", label: "CRITICAL" },
};

type Orbit = { rotX: number; rotY: number; zoom: number };

function terrainHeight(x: number, z: number) {
  const distance = Math.hypot(x / 140 + 0.1, z / 140 + 0.2);
  const mountain = Math.max(0, 1 - distance * 1.15);
  const terrace = Math.floor(mountain * 4.5) / 4.5;
  const noise = Math.sin((x / 140) * 6 + (z / 140) * 4) * 0.06 + Math.cos((x / 140) * 10 - (z / 140) * 8) * 0.04;
  return Math.max(0, (terrace * 0.75 + mountain * 0.25 + noise) * 95);
}

function nodeWorldPosition(node: MapNode) {
  const x = (node.position.x - 50) * 2.5;
  const z = (node.position.y - 50) * 2.5;
  return { x, y: terrainHeight(x, z), z };
}

function project(x: number, y: number, z: number, orbit: Orbit) {
  const cosY = Math.cos(orbit.rotY);
  const sinY = Math.sin(orbit.rotY);
  const cosX = Math.cos(orbit.rotX);
  const sinX = Math.sin(orbit.rotX);
  const x1 = x * cosY - z * sinY;
  const z1 = z * cosY + x * sinY;
  const y2 = -y * cosX - z1 * sinX;
  const z2 = z1 * cosX - y * sinX;
  return { x: WIDTH / 2 + x1 * orbit.zoom, y: HEIGHT / 2 + 15 + y2 * orbit.zoom, z: z2 };
}

export default function MineTerrain3D({ nodes, selectedId, onNodeSelect }: {
  nodes: MapNode[];
  selectedId: string | null;
  onNodeSelect: (node: MapNode | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; orbit: Orbit } | null>(null);
  const [orbit, setOrbit] = useState<Orbit>({ rotX: 0.52, rotY: -0.45, zoom: 1.05 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const projectedNodes = useMemo(() => nodes.map((node) => {
    const point = nodeWorldPosition(node);
    return { node, point: project(point.x, point.y, point.z, orbit) };
  }), [nodes, orbit]);

  useEffect(() => {
    if (!autoRotate) return;
    const timer = window.setInterval(() => setOrbit((value) => ({ ...value, rotY: value.rotY + 0.012 })), 50);
    return () => window.clearInterval(timer);
  }, [autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    const gridSize = 18;
    const terrain = Array.from({ length: gridSize + 1 }, (_, i) => Array.from({ length: gridSize + 1 }, (_, j) => {
      const x = ((i / gridSize) * 2 - 1) * 140;
      const z = ((j / gridSize) * 2 - 1) * 140;
      return { x, y: terrainHeight(x, z), z };
    }));

    const draw = () => {
      const activeOrbit = orbit;
      context.clearRect(0, 0, WIDTH, HEIGHT);
      const toScreen = (point: { x: number; y: number; z: number }) => project(point.x, point.y, point.z, activeOrbit);

      const base = [[-160, 0, -160], [160, 0, -160], [160, 0, 160], [-160, 0, 160]].map(([x, y, z]) => project(x, y, z, activeOrbit));
      context.fillStyle = "#0A101C";
      context.beginPath();
      context.moveTo(base[0].x, base[0].y);
      base.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.closePath();
      context.fill();
      context.strokeStyle = "rgba(47, 128, 237, 0.28)";
      context.lineWidth = 1.5;
      context.stroke();

      context.strokeStyle = "rgba(47, 128, 237, 0.09)";
      context.lineWidth = 1;
      for (let line = -140; line <= 140; line += 35) {
        const a = project(line, 0, -140, activeOrbit); const b = project(line, 0, 140, activeOrbit);
        const c = project(-140, 0, line, activeOrbit); const d = project(140, 0, line, activeOrbit);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
        context.beginPath(); context.moveTo(c.x, c.y); context.lineTo(d.x, d.y); context.stroke();
      }

      const quads: { points: ReturnType<typeof project>[]; depth: number; height: number; slope: number }[] = [];
      for (let i = 0; i < gridSize; i++) for (let j = 0; j < gridSize; j++) {
        const a = terrain[i][j], b = terrain[i + 1][j], c = terrain[i + 1][j + 1], d = terrain[i][j + 1];
        const points = [toScreen(a), toScreen(b), toScreen(c), toScreen(d)];
        quads.push({ points, depth: points.reduce((sum, point) => sum + point.z, 0) / 4, height: (a.y + b.y + c.y + d.y) / 4, slope: b.y - a.y });
      }
      quads.sort((a, b) => a.depth - b.depth).forEach((quad) => {
        const elevation = quad.height / 95;
        let r = 18 + elevation * 32, g = 25 + elevation * 38, b = 38 + elevation * 48;
        if (quad.slope > 2) { r *= 1.25; g *= 1.25; b *= 1.25; }
        if (quad.slope < -2) { r *= 0.75; g *= 0.75; b *= 0.75; }
        context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        context.beginPath(); context.moveTo(quad.points[0].x, quad.points[0].y);
        quad.points.slice(1).forEach((point) => context.lineTo(point.x, point.y)); context.closePath(); context.fill();
        context.strokeStyle = "rgba(71, 85, 105, 0.25)"; context.lineWidth = 0.6; context.stroke();
      });

      const currentNodes = nodes.map((node) => ({ node, world: nodeWorldPosition(node), point: null as ReturnType<typeof project> | null }));
      currentNodes.forEach((entry) => { entry.point = project(entry.world.x, entry.world.y, entry.world.z, activeOrbit); });
      context.setLineDash([4, 4]);
      context.strokeStyle = "rgba(47, 128, 237, 0.45)"; context.lineWidth = 1.4;
      for (let index = 1; index < currentNodes.length; index++) {
        const previous = currentNodes[index - 1].point!; const current = currentNodes[index].point!;
        context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke();
      }
      context.setLineDash([]);

      currentNodes.forEach(({ node, point }) => {
        const p = point!; const style = RISK_STYLES[node.status === "offline" ? "normal" : node.risk];
        const selected = node.id === selectedId; const hovered = node.id === hoveredId;
        const ring = (selected ? 16 : 12) * activeOrbit.zoom;
        context.strokeStyle = style.color; context.shadowColor = style.color; context.shadowBlur = selected || hovered ? 16 : 10; context.lineWidth = selected ? 2.5 : 1.5;
        context.beginPath(); context.ellipse(p.x, p.y + 4, ring, ring * 0.45, 0, 0, Math.PI * 2); context.stroke();
        context.fillStyle = `${style.color}30`; context.fill();
        const pillar = (selected ? 38 : 25) * activeOrbit.zoom;
        const gradient = context.createLinearGradient(p.x, p.y + 4, p.x, p.y - pillar);
        gradient.addColorStop(0, style.color); gradient.addColorStop(1, "#FFFFFF");
        context.strokeStyle = gradient; context.lineWidth = selected ? 3 : 2; context.beginPath(); context.moveTo(p.x, p.y + 4); context.lineTo(p.x, p.y - pillar); context.stroke();
        context.fillStyle = "#FFFFFF"; context.beginPath(); context.arc(p.x, p.y - pillar, (selected ? 5.5 : 4) * activeOrbit.zoom, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [nodes, orbit, autoRotate, selectedId, hoveredId]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, [data-node]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, orbit };
  };

  return <div className="relative h-full min-h-[380px] w-full select-none overflow-hidden bg-[#090E18]" onPointerDown={startDrag}
    onPointerMove={(event) => { if (!dragRef.current) return; const drag = dragRef.current; setOrbit({ ...drag.orbit, rotY: drag.orbit.rotY + (event.clientX - drag.startX) * 0.008, rotX: Math.max(0.2, Math.min(0.95, drag.orbit.rotX + (event.clientY - drag.startY) * 0.006)) }); }}
    onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="h-full w-full" />
    {projectedNodes.map(({ node, point }) => {
      const style = RISK_STYLES[node.status === "offline" ? "normal" : node.risk]; const selected = node.id === selectedId;
      return <button key={node.id} data-node type="button" onClick={() => onNodeSelect(selected ? null : node)} onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(null)}
        style={{ left: `${(point.x / WIDTH) * 100}%`, top: `${Math.max(3, (point.y - (selected ? 57 : 46)) / HEIGHT * 100)}%`, borderColor: style.color, color: style.color }}
        className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md border bg-[#0B1424]/90 px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur transition-transform hover:scale-105 ${selected ? "scale-110" : ""}`}>
        <span className="font-bold">{node.id}</span><span className="mx-1 opacity-40">|</span><span>{node.status === "offline" ? "OFFLINE" : style.label}</span><span className="mx-1 opacity-40">|</span><span>{node.riskScore}%</span>
      </button>;
    })}
    <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1 rounded-lg border border-slate-700/60 bg-[#0B1320]/90 p-1 shadow-xl backdrop-blur">
      <button type="button" onClick={() => setOrbit((value) => ({ ...value, zoom: Math.min(1.4, value.zoom + 0.1) }))} className="grid h-7 w-7 place-items-center rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Zoom in"><Plus size={14} /></button>
      <button type="button" onClick={() => setOrbit((value) => ({ ...value, zoom: Math.max(0.7, value.zoom - 0.1) }))} className="grid h-7 w-7 place-items-center rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Zoom out"><Minus size={14} /></button>
      <button type="button" onClick={() => setOrbit({ rotX: 0.52, rotY: -0.45, zoom: 1.05 })} className="grid h-7 w-7 place-items-center rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Reset view"><RotateCcw size={13} /></button>
      <button type="button" onClick={() => setAutoRotate((value) => !value)} className={`grid h-7 w-7 place-items-center rounded ${autoRotate ? "bg-blue-950/60 text-blue-300" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`} title="Toggle auto-rotate">{autoRotate ? <Pause size={12} /> : <Play size={12} />}</button>
    </div>
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-md border border-slate-700/50 bg-[#0B1320]/80 px-2.5 py-1 font-mono text-[10px] text-slate-400 backdrop-blur"><Move3d size={13} className="animate-pulse text-blue-400" />Drag to orbit 3D terrain</div>
  </div>;
}
