"use client"
import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, TrendingUp, Eye, MousePointer, DollarSign, Users, Target, Calendar } from "lucide-react"
import axios from "axios"
import { getBaseUrl } from "../../redux/client/api-client"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts"

interface Props {
  campaign: any
  onClose: () => void
}

export default function CampaignDetailModal({ campaign, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    axios.get(`${getBaseUrl()}api/ads/campaigns/${campaign.id}/stats/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      setDetail(r.data)
    }).catch(() => {
      // Fallback to campaign data already loaded
      setDetail({
        total_impressions: campaign.total_impressions ?? 0,
        total_clicks:      campaign.total_interactions ?? 0,
        total_reach:       campaign.total_reach ?? 0,
        total_spent:       campaign.budget?.spent_amount ?? 0,
        ctr:               campaign.ctr ?? 0,
        cpm:               campaign.cpm ?? 0,
        cpc:               campaign.cpc ?? 0,
        budget:            campaign.budget ?? {},
        timeline:          campaign.analytics ?? [],
      })
    }).finally(() => setLoading(false))
  }, [campaign.id])

  const metrics = [
    { label: "Alcance",       value: (detail?.total_reach ?? 0).toLocaleString(),     icon: Users,        color: "text-blue-400" },
    { label: "Impresiones",   value: (detail?.total_impressions ?? 0).toLocaleString(),icon: Eye,          color: "text-indigo-400" },
    { label: "Clicks",        value: (detail?.total_clicks ?? 0).toLocaleString(),     icon: MousePointer, color: "text-emerald-400" },
    { label: "CTR",           value: `${detail?.ctr ?? 0}%`,                           icon: TrendingUp,   color: "text-cyan-400" },
    { label: "CPM",           value: `$${(detail?.cpm ?? 0).toFixed(4)}`,              icon: Target,       color: "text-purple-400" },
    { label: "CPC",           value: `$${(detail?.cpc ?? 0).toFixed(4)}`,              icon: Target,       color: "text-pink-400" },
    { label: "Gasto",         value: `$${parseFloat(detail?.total_spent ?? 0).toFixed(4)}`, icon: DollarSign, color: "text-amber-400" },
    { label: "Presupuesto",   value: `$${detail?.budget?.total_budget ?? 0}`,          icon: DollarSign,   color: "text-orange-400" },
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#080c1a] border border-white/10 rounded-3xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#080c1a]/95 backdrop-blur">
            <div>
              <h2 className="text-base font-black text-white">{campaign.name}</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{campaign.objective} · {campaign.status}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {metrics.map((m, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <m.icon className={`w-3 h-3 ${m.color}`} />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{m.label}</span>
                    </div>
                    <div className="text-sm font-black text-white">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Budget progress */}
              {detail?.budget && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Presupuesto usado</span>
                    <span className="text-xs font-bold text-cyan-400">
                      ${parseFloat(detail.budget.spent_amount ?? 0).toFixed(4)} / ${detail.budget.total_budget}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          (parseFloat(detail.budget.spent_amount ?? 0) / parseFloat(detail.budget.total_budget || 1)) * 100
                        )}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-gray-500">
                    <span>Restante: ${parseFloat(detail.budget.remaining ?? 0).toFixed(2)}</span>
                    <span>{detail.budget.bidding_model} bidding</span>
                  </div>
                </div>
              )}

              {/* Timeline chart */}
              {detail?.timeline && detail.timeline.length > 0 && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    Impresiones y Clicks por día
                  </h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={detail.timeline} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#9ca3af", fontSize: 9 }}
                        tickFormatter={d => d.slice(5)}
                      />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ background: "#0d1117", border: "1px solid #ffffff20", borderRadius: 8 }}
                        labelStyle={{ color: "#fff", fontSize: 11 }}
                      />
                      <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Impresiones" />
                      <Bar dataKey="clicks"      fill="#06b6d4" radius={[4, 4, 0, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dates */}
              <div className="flex gap-3 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Inicio: {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fin: {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "—"}
                </div>
              </div>

              {/* Rejection reason */}
              {campaign.status === 'REJECTED' && campaign.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <p className="text-xs font-bold text-red-400 mb-1">Motivo de rechazo:</p>
                  <p className="text-xs text-red-300/80">{campaign.rejection_reason}</p>
                </div>
              )}

            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
