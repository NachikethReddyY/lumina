import { useState, useRef, useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  History,
  Grid3X3,
  ListTree,
  Settings,
  LogOut,
  CheckCircle2,
  Bell,
  User,
  AlertCircle,
  Clock,
  Cpu,
  TicketIcon,
  ChevronRight,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import Logo from "./Logo"
import { useCurrentUser } from "../hooks/useCurrentUser"
import { notificationsApi, type ApiNotification } from "../utils/apiClient"
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
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [notifLoading, setNotifLoading] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const isSuperAdmin = user?.role === "super_admin"

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await notificationsApi.list()
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)))
  }

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Ticket History", url: "/tickets", icon: History },
    ...(isAdmin
      ? [
          {
            title: "Admin Dashboard",
            url: isSuperAdmin ? "/super-admin/dashboard" : "/admin/dashboard",
            icon: Grid3X3,
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            title: "AI Routing Logs",
            url: "/routing-logs",
            icon: Cpu,
          },
          {
            title: "User Directory",
            url: "/super-admin/users",
            icon: ListTree,
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
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    navigate("/login")
  }

  const getInitials = () => {
    if (!user) return "?"
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }

  return (
    <aside className={`sidebar-container ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <Logo size="sm" showText={false} />
          <span className="sidebar-logo-text">Lumina</span>
        </Link>

        <div className="relative" ref={notificationsRef}>
          <button
            className="notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications) fetchNotifications()
            }}
            title={`${unreadCount} unread`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
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
                ) : notifications.length > 0 ? (
                  notifications.map((n) => {
                    const Icon = actionIcon(n.action)
                    const isUnread = !readIds.has(n.id)
                    return (
                      <div
                        key={n.id}
                        className={`notification-item ${isUnread ? "unread" : "read"}`}
                        onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                      >
                        <div className="notification-icon-wrapper">
                          <Icon size={16} />
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">
                            {ACTION_LABELS[n.action] || n.action.replace(/_/g, " ")}
                          </div>
                          <div className="notification-message">
                            {n.first_name} {n.last_name}
                            {(n.metadata as Record<string, string>)?.ticket_id
                              ? ` · #${String((n.metadata as Record<string, string>).ticket_id).slice(0, 8)}`
                              : ""}
                          </div>
                          <div className="notification-time">{timeAgo(n.created_at)}</div>
                        </div>
                        {isUnread && <div className="notification-dot" />}
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

      <div className="sidebar-content">
        <div className="sidebar-group">
          <div className="sidebar-group-label">Navigation</div>
          <nav className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`sidebar-menu-item ${location.pathname === item.url ? "active" : ""}`}
                title={isCollapsed ? item.title : ""}
              >
                <item.icon />
                <span>{item.title}</span>
              </Link>
            ))}
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
              src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${user.avatar_url}`}
              alt="avatar"
              className="avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar">{getInitials()}</div>
          )}
          <div className="user-info">
            <span className="user-name">{user ? `${user.first_name} ${user.last_name}` : "Lumina User"}</span>
            <span className="user-email">{user?.email || "not-signed-in"}</span>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
