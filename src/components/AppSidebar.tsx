import { useState, useRef, useEffect, type CSSProperties } from "react"
import {
  LayoutDashboard,
  History,
  ListTree,
  Settings,
  LogOut,
  CheckCircle2,
  Bell,
  User,
  UserCheck,
  AlertCircle,
  Clock,
  TicketIcon,
  ChevronRight,
  Inbox,
  Check,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import Logo from "./Logo"
import { useCurrentUser } from "../hooks/useCurrentUser"
import { useApiSWR } from "../hooks/useApiSWR"
import { notificationsApi, usersApi, type ApiNotification, type ApiUser } from "../utils/apiClient"
import { getUserRoleLabel } from "../utils/userDisplay"
import { canAccessApprovalQueue, canAccessUserDirectory } from "../utils/orgRoles"
import { clearAuthSession } from "../utils/sessionAuth"
import { apiAssetUrl } from "../utils/apiBase"
import "./Sidebar.css"

const ACTION_LABELS: Record<string, string> = {
  ticket_created: "New ticket created",
  ticket_assigned: "Ticket assigned",
  ticket_status_changed: "Status updated",
  ticket_rerouted: "Ticket re-routed",
  ticket_rated: "Ticket rated",
  ticket_comment_added: "Comment added",
  user_role_changed: "Role changed",
  user_deleted: "User removed",
  seed_users_loaded: "System seeded",
  seed_tickets_loaded: "Tickets seeded",
  seed_assignment_reviewed: "Assignment reviewed",
}

function actionIcon(action: string) {
  if (action.includes("created") || action.includes("loaded")) return TicketIcon
  if (action.includes("resolved") || action.includes("rated")) return CheckCircle2
  if (action.includes("status") || action.includes("rerouted")) return Clock
  if (action.includes("role") || action.includes("deleted")) return AlertCircle
  return Bell
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const showUserDirectory = canAccessUserDirectory(user)
  const showApprovals = canAccessApprovalQueue(user)

  const { data: notificationsData, loading: notifLoading, revalidate: revalidateNotifications } = useApiSWR<ApiNotification[]>(
    user ? "notifications:all" : null,
    async () => {
      const res = await notificationsApi.list()
      if (!res.ok) throw new Error("Could not load notifications.")
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    { ttl: 30_000 }
  )

  const notifications = notificationsData ?? []

  const { data: usersMeta } = useApiSWR<{ pending: number; total: number }>(
    showUserDirectory ? "users:sidebar-meta" : null,
    async () => {
      const res = await usersApi.list()
      if (!res.ok) throw new Error("Could not load users.")
      const data = await res.json()
      const list = Array.isArray(data) ? data as ApiUser[] : []
      return {
        pending: list.filter((u) => u.status === "pending").length,
        total: list.length,
      }
    },
    { ttl: 60_000 }
  )

  const pendingApprovalCount = usersMeta?.pending ?? 0
  const userDirectoryCount = usersMeta?.total ?? 0

  const visibleNotifications = notifications.filter((n) => !hiddenIds.has(n.id))
  const unreadCount = visibleNotifications.length

  const markAllRead = () => {
    setHiddenIds(new Set(notifications.map((n) => n.id)))
  }

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, color: "#2563eb" },
    { title: "Ticket Queue", url: "/tickets", icon: Inbox, color: "#1f8a65" },
    { title: "Ticket History", url: "/tickets/history", icon: History, color: "#8b5cf6" },
    ...(showApprovals
      ? [
          {
            title: "Approval Queue",
            url: "/admin/approvals",
            icon: UserCheck,
            color: "#d97706",
            badge: pendingApprovalCount,
          },
        ]
      : []),
    ...(showUserDirectory
      ? [
          {
            title: "User Directory",
            url: "/admin/users",
            icon: ListTree,
            color: "#64748b",
            badge: userDirectoryCount || undefined,
          },
        ]
      : []),
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === ".") {
        event.preventDefault()
        onToggle()
      }
    }
    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [onToggle])

  const handleSignOut = () => {
    clearAuthSession()
    navigate("/login")
  }

  const getInitials = () => {
    if (!user) return "?"
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }

  const isMenuItemActive = (url: string) => {
    if (url === "/tickets") {
      return location.pathname === "/tickets" || /^\/tickets\/(?!history(?:\/|$))/.test(location.pathname)
    }
    if (url === "/tickets/history") return location.pathname.startsWith("/tickets/history")
    if (url.startsWith("/admin/")) return location.pathname === url
    return location.pathname === url || (url === "/dashboard" && location.pathname === "/dashboard/tickets")
  }

  return (
    <aside className={`sidebar-container ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-top-row">
          <Link to="/dashboard" className="sidebar-brand-link" style={{ textDecoration: 'none' }}>
            <Logo size="sm" showText={false} />
            {!isCollapsed && <span className="sidebar-logo-text">Lumina</span>}
          </Link>

          <div className="notification-shell" ref={notificationsRef}>
          <button
            className="notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications) void revalidateNotifications()
            }}
            title={`${unreadCount} unread notifications`}
          >
            <Bell size={18} className="notification-bell-icon" />
            {notifLoading ? (
              <span className="notification-badge notification-badge--loading" />
            ) : unreadCount > 0 ? (
              <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-as-read-btn" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifLoading ? (
                  <div className="notifications-empty">Loading…</div>
                ) : visibleNotifications.length > 0 ? (
                  visibleNotifications.map((n) => {
                    const Icon = actionIcon(n.action)
                    return (
                      <div
                        key={n.id}
                        className="notification-item unread"
                      >
                        <div className="notification-icon-wrapper">
                          <Icon size={16} />
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">
                            {ACTION_LABELS[n.action] || n.action.replace(/_/g, " ")}
                          </div>
                          <div className="notification-message">
                            {`${n.first_name || ''} ${n.last_name || ''}`.trim() || n.actor_email || 'Deleted user'}
                            {(n.metadata as Record<string, string>)?.ticket_id
                              ? ` · #${String((n.metadata as Record<string, string>).ticket_id).slice(0, 8)}`
                              : ""}
                          </div>
                          <div className="notification-time">{timeAgo(n.created_at)}</div>
                        </div>
                        <div className="notification-dot" />
                        <button
                          className="notification-mark-read-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setHiddenIds((prev) => new Set([...prev, n.id]))
                          }}
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    )
                  })
                ) : (
                  <div className="notifications-empty">No notifications</div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-group">
          <div className="sidebar-group-label">Navigation</div>
          <nav className="sidebar-menu">
            {menuItems.map((item) => {
              const iconStyle = { "--sidebar-icon-color": item.color } as CSSProperties;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`sidebar-menu-item ${isMenuItemActive(item.url) ? "active" : ""}`}
                  title={isCollapsed ? item.title : ""}
                >
                  <span className="sidebar-menu-icon" style={iconStyle}>
                    <item.icon size={16} />
                  </span>
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer" ref={userMenuRef}>
        {showUserMenu && (
          <div className="user-menu-dropdown">
            <Link to="/profile" className="user-menu-item no-underline" onClick={() => setShowUserMenu(false)}>
              <User size={16} />
              <span>View Profile</span>
            </Link>
            <Link to="/account-settings" className="user-menu-item no-underline" onClick={() => setShowUserMenu(false)}>
              <Settings size={16} />
              <span>Account Settings</span>
            </Link>
            <div className="user-menu-divider" />
            <button className="user-menu-item logout" onClick={handleSignOut}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
            <div className="user-menu-item-hint">
              <ChevronRight size={12} />
              <span style={{ fontSize: "10px", opacity: 0.4 }}>⌘ + .</span>
            </div>
          </div>
        )}

        <button className="user-profile-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
          {user?.avatar_url ? (
            <img
              src={apiAssetUrl(user.avatar_url)}
              alt="avatar"
              className="avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar">{getInitials()}</div>
          )}
          <div className="user-info">
            <span className="user-name">{user ? `${user.first_name} ${user.last_name}` : "Lumina User"}</span>
            <span className="user-email">{getUserRoleLabel(user) || user?.email || "not-signed-in"}</span>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
