"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ────────────────────────────────────────────────────────────
//  GraphView — force-directed note graph (no external libs)
// ────────────────────────────────────────────────────────────

interface NoteNode {
    id: string;
    title: string;
    linksTo: { id: string }[];
}

interface GraphViewProps {
    notes: NoteNode[];
    activeNoteId: string | null;
    onSelectNote: (id: string) => void;
    onClose: () => void;
}

// Simulation node (mutable)
interface SimNode {
    id: string;
    title: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const REPULSION = 6000;
const ATTRACTION = 0.008;
const DAMPING = 0.75;
const MIN_DIST = 60;
const NODE_RADIUS = 24;

export function GraphView({ notes, activeNoteId, onSelectNote, onClose }: GraphViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simRef = useRef<SimNode[]>([]);
    const rafRef = useRef<number>(0);
    const [hovered, setHovered] = useState<string | null>(null);

    // Build edge list from linksTo
    const edges = notes.flatMap((n) =>
        n.linksTo.map((t) => ({ from: n.id, to: t.id })),
    );

    // Initialise sim nodes (randomly placed)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // offsetWidth/offsetHeight reflect the CSS layout size and are always correct,
        // unlike canvas.width which starts at 300×150 until the ResizeObserver sets it.
        const w = canvas.offsetWidth || 800;
        const h = canvas.offsetHeight || 500;

        // Keep positions for existing nodes, place new ones in a circle so they start spread out
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) * 0.45;
        const existing = new Map(simRef.current.map((n) => [n.id, n]));
        simRef.current = notes.map((n, i) => {
            const prev = existing.get(n.id);
            if (prev) return prev;
            const angle = (i / notes.length) * Math.PI * 2 - Math.PI / 2;
            return {
                id: n.id,
                title: n.title,
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                vx: 0,
                vy: 0,
            };
        });
    }, [notes]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { width: W, height: H } = canvas;
        const nodes = simRef.current;

        // ── Physics step ──────────────────────────────────────
        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i]!;
                const b = nodes[j]!;
                const dx = b.x - a.x || (Math.random() - 0.5) * 2;
                const dy = b.y - a.y || (Math.random() - 0.5) * 2;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
                const force = REPULSION / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                a.vx -= fx;
                a.vy -= fy;
                b.vx += fx;
                b.vy += fy;
            }
        }

        // Attraction along edges
        const nodeById = new Map(nodes.map((n) => [n.id, n]));
        for (const edge of edges) {
            const a = nodeById.get(edge.from);
            const b = nodeById.get(edge.to);
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const force = ATTRACTION;
            a.vx += dx * force;
            a.vy += dy * force;
            b.vx -= dx * force;
            b.vy -= dy * force;
        }

        // Centre gravity
        for (const n of nodes) {
            n.vx += (W / 2 - n.x) * 0.002;
            n.vy += (H / 2 - n.y) * 0.002;
            n.vx *= DAMPING;
            n.vy *= DAMPING;
            n.x = Math.max(NODE_RADIUS, Math.min(W - NODE_RADIUS, n.x + n.vx));
            n.y = Math.max(NODE_RADIUS, Math.min(H - NODE_RADIUS, n.y + n.vy));
        }

        // ── Render ─────────────────────────────────────────────
        ctx.clearRect(0, 0, W, H);

        // Edges
        ctx.strokeStyle = "rgba(100,130,110,0.25)";
        ctx.lineWidth = 1.5;
        for (const edge of edges) {
            const a = nodeById.get(edge.from);
            const b = nodeById.get(edge.to);
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            const ax = b.x - Math.cos(angle) * (NODE_RADIUS + 4);
            const ay = b.y - Math.sin(angle) * (NODE_RADIUS + 4);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay - 8 * Math.sin(angle - 0.4));
            ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay - 8 * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fillStyle = "rgba(100,130,110,0.4)";
            ctx.fill();
        }

        // Nodes
        for (const n of nodes) {
            const isActive = n.id === activeNoteId;
            const isHovered = n.id === hovered;

            // Shadow / glow for active
            if (isActive) {
                ctx.shadowColor = "rgba(100,155,115,0.5)";
                ctx.shadowBlur = 14;
            }

            // Circle
            ctx.beginPath();
            ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = isActive
                ? "#6b9f7e"
                : isHovered
                    ? "#e8e0d0"
                    : "#f5f0e8";
            ctx.fill();
            ctx.strokeStyle = isActive ? "#4a7a60" : "rgba(80,70,60,0.15)";
            ctx.lineWidth = isActive ? 2.5 : 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Label
            const label = n.title.length > 12 ? n.title.slice(0, 11) + "…" : n.title;
            ctx.fillStyle = isActive ? "#fff" : "#3a3530";
            ctx.font = `${isActive ? "bold " : ""}10px 'Inter', sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, n.x, n.y);
        }

        rafRef.current = requestAnimationFrame(draw);
    }, [edges, activeNoteId, hovered]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [draw]);

    // Resize canvas to match container
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
        ro.observe(canvas);
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        return () => ro.disconnect();
    }, []);

    // Hit-test on mouse events
    const hitTest = useCallback(
        (px: number, py: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const x = px - rect.left;
            const y = py - rect.top;
            for (const n of simRef.current) {
                const dx = n.x - x;
                const dy = n.y - y;
                if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return n.id;
            }
            return null;
        },
        [],
    );

    return (
        /* Full-screen dimmed backdrop */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
            <div className="relative flex h-[75vh] w-[80vw] max-w-4xl flex-col overflow-hidden rounded-3xl bg-parchment shadow-2xl border border-charcoal/10">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-charcoal/8 px-6 py-4">
                    <div>
                        <h2 className="font-serif text-lg font-bold text-charcoal">Note Graph</h2>
                        <p className="text-xs text-charcoal/40">
                            {notes.length} notes · {edges.length} connections
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Canvas */}
                <div className="relative flex-1 overflow-hidden">
                    {notes.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-charcoal/30 text-sm">
                            No notes yet — create some and link them with [[Wiki Links]]
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            className="h-full w-full cursor-pointer"
                            style={{ display: "block" }}
                            onClick={(e) => {
                                const id = hitTest(e.clientX, e.clientY);
                                if (id) {
                                    onSelectNote(id);
                                    onClose();
                                }
                            }}
                            onMouseMove={(e) => setHovered(hitTest(e.clientX, e.clientY))}
                            onMouseLeave={() => setHovered(null)}
                        />
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 border-t border-charcoal/8 px-6 py-3 text-[10px] text-charcoal/40 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full bg-[#6b9f7e]" />
                        Active note
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full bg-[#f5f0e8] border border-charcoal/20" />
                        Other note
                    </span>
                    <span>Click node to open · Arrows show [[wiki links]]</span>
                </div>
            </div>
        </div>
    );
}
