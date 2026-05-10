"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bell, Heart, MessageCircle, UserPlus, Eye, Star, Gift, AtSign, Check, ChevronLeft, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useNotificationsStore, BuzzyNotification } from "../../context/NotificationsStore"
import { getBaseUrl, getMediaUrl } from "../../redux/client/api-client"

interface Props {
  open: boolean
  onClose: () => void
}

const TYPE_ICON: Record<BuzzyNotification["notification_type"], React.ReactNode> = {
  follow:        <UserPlus      className="w-4 h-4 text-purple-400" />,
  like:          <Heart         className="w-4 h-4 text-pink-400" />,
  comment:       <MessageCircle className="w-4 h-4 text-blue-400" />,
  comment_reply: <MessageCircle className="w-4 h-4 text-cyan-400" />,
  profile_visit: <Eye           className="w-4 h-4 text-green-400" />,
  story_like:    <Star          className="w-4 h-4 text-yellow-400" />,
  gift:          <Gift          className="w-4 h-4 text-orange-400" />,
  mention:       <AtSign        className="w-4 h-4 text-indigo-400" />,
  earning:       <Star          className="w-4 h-4 text-amber-400" />,
  welcome:       <Gift          className="w-4 h-4 text-cyan-400" />,
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return `Hace ${Math.floor(diff)}s`
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return `Hace ${Math.floor(diff / 86400)}d`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Hoy"
  if (d.toDateString() === yesterday.toDateString()) return "Ayer"
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString()
}

function avatar(n: BuzzyNotification): string | null {
  if (!n.actor?.profile_picture) return null
  const pic = n.actor.profile_picture
  return pic.startsWith("http") ? pic : getMediaUrl(pic)
}

function AvatarOrInitial({ n, size = "w-10 h-10" }: { n: BuzzyNotification; size?: string }) {
  const initials = n.actor?.username?.[0]?.toUpperCase() ?? "?"
  const colors = ["from-purple-500 to-blue-500","from-pink-500 to-orange-500","from-green-500 to-teal-500","from-yellow-500 to-red-500"]
  const color = colors[(n.actor?.id ?? 0) % colors.length]
  const src = avatar(n)
  return src ? (
    <img src={src} alt={n.actor?.username} className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-lg`}>
      {initials}
    </div>
  )
}

// Groups profile_visit notifications by calendar day
function groupProfileVisits(visits: BuzzyNotification[]): Record<string, BuzzyNotification[]> {
  const groups: Record<string, BuzzyNotification[]> = {}
  for (const n of visits) {
    const k = dayKey(n.created_at)
    if (!groups[k]) groups[k] = []
    groups[k].push(n)
  }
  return groups
}

// Build the unified list for the main panel:
// - non-profile_visit: kept as-is
// - profile_visit grouped by day: one representative entry per day
type ListItem =
  | { kind: "notification"; data: BuzzyNotification }
  | { kind: "visit_group"; dayKey: string; label: string; visits: BuzzyNotification[]; latest: BuzzyNotification }

function buildMainList(notifications: BuzzyNotification[]): ListItem[] {
  const visits = notifications.filter(n => n.notification_type === "profile_visit")
  const others = notifications.filter(n => n.notification_type !== "profile_visit")
  const groups = groupProfileVisits(visits)

  const visitItems: ListItem[] = Object.entries(groups).map(([key, group]) => ({
    kind: "visit_group",
    dayKey: key,
    label: dayLabel(group[0].created_at),
    visits: group,
    latest: group[0],
  }))

  const otherItems: ListItem[] = others.map(n => ({ kind: "notification", data: n }))

  // Merge and sort by date descending
  const all: ListItem[] = [...visitItems, ...otherItems]
  all.sort((a, b) => {
    const dateA = a.kind === "visit_group" ? a.latest.created_at : a.data.created_at
    const dateB = b.kind === "visit_group" ? b.latest.created_at : b.data.created_at
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })
  return all
}

export default function NotificationPanel({ open, onClose }: Props) {
  const { t } = useTranslation("notifications")
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, fetch, markAllRead, markRead } = useNotificationsStore()
  const fetchedRef = useRef(false)
  const [visitGroup, setVisitGroup] = useState<{ label: string; visits: BuzzyNotification[] } | null>(null)

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetch()
      fetchedRef.current = true
    }
  }, [open, fetch])

  useEffect(() => {
    if (open && unreadCount > 0) markAllRead()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close sub-panel when main closes
  useEffect(() => {
    if (!open) setVisitGroup(null)
  }, [open])

  const handleClick = (n: BuzzyNotification) => {
    if (!n.is_read) markRead([n.id])
    if (n.video_uuid) { navigate(`/video/${n.video_uuid}`); onClose() }
    else if (n.actor?.username) { navigate(`/profile/${n.actor.username}`); onClose() }
  }

  const mainList = buildMainList(notifications)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* Panel — full height, attached to top */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-[61] flex flex-col bg-[#0b0d1a] border-l border-white/8 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-[#0b0d1a]/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">{t("title", "Notificaciones")}</h3>
                {unreadCount > 0 && (
                  <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    <Check className="w-3 h-3" />
                    {t("markAllRead", "Marcar todo")}
                  </button>
                )}
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {loading && <div className="p-8 text-center text-gray-400 text-sm">{t("loading", "Cargando...")}</div>}
              {!loading && notifications.length === 0 && (
                <div className="p-10 text-center">
                  <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{t("empty", "Sin notificaciones")}</p>
                </div>
              )}

              {mainList.map((item, idx) => {
                if (item.kind === "visit_group") {
                  const hasUnread = item.visits.some(v => !v.is_read)
                  const others = item.visits.slice(1)
                  const avatarsToShow = item.visits.slice(0, 4)
                  return (
                    <motion.button
                      key={`vg-${item.dayKey}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                      onClick={() => setVisitGroup({ label: item.label, visits: item.visits })}
                      className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${hasUnread ? "bg-green-900/10" : ""}`}
                    >
                      {/* Stacked avatars */}
                      <div className="relative flex-shrink-0 w-12 h-10">
                        {avatarsToShow.map((v, i) => (
                          <div key={v.id} className="absolute" style={{ left: i * 8, zIndex: avatarsToShow.length - i }}>
                            <AvatarOrInitial n={v} size="w-9 h-9" />
                          </div>
                        ))}
                        <span className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-0.5 z-10">
                          <Eye className="w-3.5 h-3.5 text-green-400" />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-snug">
                          {item.label} — {item.visits.length} {item.visits.length === 1 ? "visita" : "visitas"} al perfil
                        </p>
                        {others.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {item.latest.actor?.username}
                            {others.length > 0 && ` y ${others.length} más`}
                          </p>
                        )}
                        <span className="text-xs text-gray-600 mt-0.5 block">{timeAgo(item.latest.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasUnread && <span className="w-2 h-2 rounded-full bg-green-400" />}
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                    </motion.button>
                  )
                }

                const n = item.data
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${!n.is_read ? "bg-purple-900/10" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <AvatarOrInitial n={n} />
                      <span className="absolute -bottom-1 -right-1 bg-[#0b0d1a] rounded-full p-0.5">
                        {TYPE_ICON[n.notification_type]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-snug">{n.message}</p>
                      <span className="text-xs text-gray-500 mt-1 block">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.video_thumbnail && (
                      <img
                        src={n.video_thumbnail.startsWith("http") ? n.video_thumbnail : getMediaUrl(n.video_thumbnail)}
                        alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* Sub-panel: profile visits of a day — full screen */}
          <AnimatePresence>
            {visitGroup && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-0 z-[62] flex flex-col bg-[#0b0d1a]"
              >
                {/* Sub-header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setVisitGroup(null)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </motion.button>
                  <div>
                    <h3 className="text-white font-bold text-base">Visitas al perfil</h3>
                    <p className="text-xs text-gray-500">{visitGroup.label}</p>
                  </div>
                </div>

                {/* Centered count hero */}
                <div className="flex flex-col items-center justify-center py-8 px-4 shrink-0">
                  <div className="relative flex items-center justify-center w-24 h-24 mb-4">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/30 to-teal-500/20 blur-xl" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex flex-col items-center justify-center shadow-lg shadow-green-500/30">
                      <span className="text-white font-black text-3xl leading-none">{visitGroup.visits.length}</span>
                    </div>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {visitGroup.visits.length === 1 ? "persona vio tu perfil" : "personas vieron tu perfil"}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">{visitGroup.label}</p>
                  {/* Stacked avatars preview */}
                  <div className="flex items-center mt-4">
                    {visitGroup.visits.slice(0, 6).map((v, i) => (
                      <div key={v.id} className="relative" style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 6 - i }}>
                        <AvatarOrInitial n={v} size="w-8 h-8" />
                      </div>
                    ))}
                    {visitGroup.visits.length > 6 && (
                      <div className="relative w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-white font-bold" style={{ marginLeft: -10 }}>
                        +{visitGroup.visits.length - 6}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-4 border-t border-white/8 mb-1 shrink-0" />

                {/* Visit list */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {visitGroup.visits.map((n, i) => (
                    <motion.button
                      key={n.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                      onClick={() => { navigate(`/profile/${n.actor?.username}`); onClose(); setVisitGroup(null) }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <AvatarOrInitial n={n} />
                        <span className="absolute -bottom-1 -right-1 bg-[#0b0d1a] rounded-full p-0.5">
                          <Eye className="w-3.5 h-3.5 text-green-400" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">@{n.actor?.username}</p>
                        <span className="text-xs text-gray-500 mt-0.5 block">{timeAgo(n.created_at)}</span>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
