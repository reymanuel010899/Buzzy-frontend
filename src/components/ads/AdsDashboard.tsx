"use client"
import React, { useState } from "react"
// motion removed — not used in this file
import {
  Users, DollarSign, Rocket, RotateCcw,
  Download, Eye, BarChart2, MousePointer, Pause, Play,
  Clock, AlertTriangle, XCircle, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react"
import axios from "axios"
import { getBaseUrl } from "../../redux/client/api-client"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import CampaignDetailModal from "./CampaignDetailModal"

interface Stats {
  total_reach: number
  total_impressions: number
  total_interactions: number
  total_spent: number
  active_campaigns: number
  draft_campaigns?: number
  ctr: number
  cpm: number
  cpc: number
  real_reach_pool: number
  timeline: { date: string; impressions: number; clicks: number }[]
}

interface AdsDashboardProps {
  campaigns: any[]
  stats?: Stats
  onRefresh?: () => void
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ACTIVE:    { label: "Activo",      color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle },
  PAUSED:    { label: "Pausado",     color: "text-amber-400",   bg: "bg-amber-500/20",   icon: Pause },
  DRAFT:     { label: "Borrador",    color: "text-cyan-400",    bg: "bg-cyan-500/20",    icon: Clock },
  IN_REVIEW: { label: "En Revisión", color: "text-yellow-400",  bg: "bg-yellow-500/20",  icon: AlertTriangle },
  REJECTED:  { label: "Rechazado",   color: "text-red-400",     bg: "bg-red-500/20",     icon: XCircle },
  COMPLETED: { label: "Completado",  color: "text-purple-400",  bg: "bg-purple-500/20",  icon: CheckCircle },
}

function fmt(n: number)    { return n?.toLocaleString?.() ?? "0" }
function fmtPct(n: number) { return `${n?.toFixed?.(2) ?? "0.00"}%` }
function fmtUsd(n: number) { return `$${n?.toFixed?.(4) ?? "0.0000"}` }

const AdsDashboard: React.FC<AdsDashboardProps> = ({ campaigns, stats, onRefresh }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [chartMetric, setChartMetric] = useState<"impressions" | "clicks">("impressions")
  // 0 = chart panel, 1 = table panel
  const [panel, setPanel] = useState(0)

  const token  = () => localStorage.getItem("accessToken")
  const headers = () => ({ Authorization: `Bearer ${token()}` })
  const base = () => getBaseUrl().replace(/\/+$/, '')
  const apiPost = async (url: string) => { await axios.post(`${base()}/${url}`, {}, { headers: headers() }); onRefresh?.() }

  const handleRelaunch = (id: number) => apiPost(`api/ads/campaigns/${id}/relaunch/`).catch(() => alert("No se pudo relanzar."))
  const handlePause    = (id: number) => apiPost(`api/ads/campaigns/${id}/pause/`).catch(() => alert("No se pudo pausar."))
  const handleResume   = (id: number) => apiPost(`api/ads/campaigns/${id}/resume/`).catch(() => alert("No se pudo reanudar."))

  const handlePay = async (id: number) => {
    try {
      const res = await axios.post(`${base()}/api/ads/campaigns/${id}/create_checkout_session/`, {}, { headers: headers() })
      if (res.data.url) window.location.href = res.data.url
    } catch { alert("No se pudo iniciar el pago.") }
  }

  const handleExportCsv = async () => {
    try {
      const res = await axios.get(`${base()}/api/ads/campaigns/export_csv/`, { headers: headers(), responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = "buzzy_ads_report.csv"; a.click()
    } catch { alert("Error al exportar.") }
  }

  const statCards = [
    { label: "Alcance",     value: fmt(stats?.total_reach ?? 0),       icon: Users,        color: "text-blue-400",    sub: `Pool: ${fmt(stats?.real_reach_pool ?? 0)}` },
    { label: "Impresiones", value: fmt(stats?.total_impressions ?? 0),  icon: Eye,          color: "text-indigo-400",  sub: `CTR: ${fmtPct(stats?.ctr ?? 0)}` },
    { label: "Clicks",      value: fmt(stats?.total_interactions ?? 0), icon: MousePointer, color: "text-emerald-400", sub: `CPC: ${fmtUsd(stats?.cpc ?? 0)}` },
    { label: "Gasto",       value: fmtUsd(stats?.total_spent ?? 0),     icon: DollarSign,   color: "text-amber-400",   sub: `CPM: ${fmtUsd(stats?.cpm ?? 0)}` },
    { label: "Activas",     value: fmt(stats?.active_campaigns ?? 0),   icon: Rocket,       color: "text-rose-400",    sub: "" },
    { label: "Borradores",  value: fmt(stats?.draft_campaigns ?? 0),    icon: Clock,        color: "text-cyan-400",    sub: "" },
  ]

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 flex-shrink-0">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white/5 border border-white/5 px-3 py-3 rounded-2xl hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
              <div className={`p-1.5 rounded-lg bg-white/5 ${s.color}`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-white leading-none">{s.value}</div>
            {s.sub && <div className="text-[9px] text-gray-500 mt-1 leading-none">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Slider panels: chart ↔ table ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-white/5 bg-white/5">

        {/* Slide track */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${panel * 50}%)`, width: "200%" }}
        >

          {/* Panel 0 — Chart */}
          <div className="w-1/2 h-full flex flex-col p-3">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Rendimiento 14 días</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(["impressions", "clicks"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setChartMetric(m)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${
                        chartMetric === m ? "bg-cyan-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {m === "impressions" ? "Impr." : "Clicks"}
                    </button>
                  ))}
                </div>
                {/* Slide to table */}
                <button
                  onClick={() => setPanel(1)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-black uppercase hover:bg-cyan-500/30 transition-all"
                >
                  Campañas <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {stats?.timeline && stats.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.timeline} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 8 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 8 }} />
                    <Tooltip
                      contentStyle={{ background: "#0d1117", border: "1px solid #ffffff20", borderRadius: 6, fontSize: 10 }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#06b6d4" }}
                    />
                    <Line type="monotone" dataKey={chartMetric} stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#06b6d4" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-gray-600">Sin datos de rendimiento aún.</div>
              )}
            </div>
          </div>

          {/* Panel 1 — Table */}
          <div className="w-1/2 h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPanel(0)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[9px] font-black uppercase transition-all"
                >
                  <ChevronLeft className="w-3 h-3" /> Gráfica
                </button>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Campañas</span>
              </div>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black text-gray-400 hover:text-white uppercase transition-all"
              >
                <Download className="w-2.5 h-2.5" /> CSV
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#080c1a]">
                  <tr className="text-[8px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                    {["Nombre", "Estado", "Impr.", "CTR", "Gasto", "Acciones"].map(h => (
                      <th key={h} className="px-3 py-1.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[10px] text-gray-600">
                        No tienes campañas aún.
                      </td>
                    </tr>
                  ) : campaigns.map((c, i) => {
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                    const Icon = cfg.icon
                    return (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            className="text-[10px] font-bold text-white group-hover:text-cyan-400 text-left hover:underline max-w-[100px] truncate block"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold w-fit ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-2 h-2" />{cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-300 whitespace-nowrap">
                          {fmt(c.total_impressions ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-[10px] whitespace-nowrap">
                          <span className={`font-bold ${(c.ctr ?? 0) > 1 ? "text-emerald-400" : "text-gray-400"}`}>
                            {fmtPct(c.ctr ?? 0)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-[10px] text-gray-300">{fmtUsd(c.budget?.spent_amount ?? 0)}</div>
                          <div className="mt-0.5 h-0.5 w-12 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(c.spent_pct ?? 0, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right space-x-0.5 whitespace-nowrap">
                          <button onClick={() => setSelectedCampaign(c)} className="p-1 rounded-md bg-white/5 text-gray-400 hover:bg-indigo-500 hover:text-white transition-all" title="Ver métricas">
                            <BarChart2 className="w-3 h-3" />
                          </button>
                          {c.status === 'ACTIVE' && (
                            <button onClick={() => handlePause(c.id)} className="p-1 rounded-md bg-white/5 text-amber-400 hover:bg-amber-500 hover:text-white transition-all" title="Pausar">
                              <Pause className="w-3 h-3" />
                            </button>
                          )}
                          {c.status === 'PAUSED' && (
                            <button onClick={() => handleResume(c.id)} className="p-1 rounded-md bg-white/5 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all" title="Reanudar">
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                          {['COMPLETED', 'PAUSED', 'REJECTED'].includes(c.status) && (
                            <button onClick={() => handleRelaunch(c.id)} className="p-1 rounded-md bg-white/5 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all" title="Relanzar">
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          {c.status === 'DRAFT' && (
                            <button onClick={() => handlePay(c.id)} className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[8px] font-black uppercase transition-all">
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {selectedCampaign && (
        <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      )}
    </div>
  )
}

export default AdsDashboard
