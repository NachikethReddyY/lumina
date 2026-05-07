import { useState, useRef, useEffect } from "react"
import {
  LayoutDashboard,
  History,
  Grid3X3,
  ListTree,
  Settings,
  HelpCircle,
  LogOut,
  CheckCircle2,
  Smile,
  Users2,
  Bell,
  User,
  AlertCircle,
  Clock,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import Logo from "./Logo"
import "./Sidebar.css"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ticket History",
    url: "/tickets",
    icon: History,
  },
  {
    title: "Admin Matrix",
    url: "/admin/dashboard",
    icon: Grid3X3,
  },
  {
    title: "Routing Logs",
    url: "/routing-logs",
    icon: ListTree,
  },
]

const stats = [
  { label: "Resolved", value: "1,284", icon: CheckCircle2, type: "resolved" },
  { label: "Satisfied", value: "98.2%", icon: Smile, type: "satisfied" },
  { label: "Customers", value: "850", icon: Users2, type: "customers" },
]

interface Notification {
  id: string;
  title: string;
  message: string;
  icon: typeof AlertCircle;
  type: "alert" | "info" | "success" | "update";
  timestamp: string;
  read: boolean;
}

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Critical Ticket",
    message: "TKT-003: App Crashes on Launch",
    icon: AlertCircle,
    type: "alert",
    timestamp: "2 mins ago",
    read: false,
  },
  {
    id: "2",
    title: "Ticket Resolved",
    message: "TKT-002: Password Reset issue fixed",
    icon: CheckCircle2,
    type: "success",
    timestamp: "1 hour ago",
    read: true,
  },
  {
    id: "3",
    title: "Status Update",
    message: "TKT-001 moved to In Progress",
    icon: Clock,
    type: "info",
    timestamp: "3 hours ago",
    read: true,
  },
]

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close menus when clicking outside
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

  // Handle keyboard shortcut Cmd+. or Ctrl+.
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

  return (
    <aside className={`sidebar-container ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link to="/dashboard/tickets" className="flex items-center gap-2 no-underline">
          <Logo size="sm" showText={false} />
          <span className="sidebar-logo-text">Lumina</span>
        </Link>
        {/* Notification Bell Button */}
        <div className="relative" ref={notificationsRef}>
          <button
            className="notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title={`${unreadCount} unread notifications`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    className="mark-as-read-btn"
                    onClick={() =>
                      setNotifications(notifications.map((n) => ({ ...n, read: true })))
                    }
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.read ? "read" : "unread"}`}
                    >
                      <div className="notification-icon-wrapper">
                        <notification.icon size={16} />
                      </div>
                      <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                        <div className="notification-time">{notification.timestamp}</div>
                      </div>
                      {!notification.read && (
                        <div className="notification-dot" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="notifications-empty">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-content">
        {/* Main Navigation */}
        <div className="sidebar-group">
          <div className="sidebar-group-label">Navigation</div>
          <nav className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`sidebar-menu-item ${
                  location.pathname === item.url ? "active" : ""
                }`}
                title={isCollapsed ? item.title : ""}
              >
                <item.icon />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Statistics Section */}
        <div className="sidebar-group">
          <div className="sidebar-group-label">Live Statistics</div>
          <div className="sidebar-stats">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                className={`stat-widget ${stat.type}`}
                title={isCollapsed ? `${stat.label}: ${stat.value}` : ""}
              >
                <div className="stat-widget-header">
                  <span className="stat-widget-label">{stat.label}</span>
                  <stat.icon className="stat-widget-icon" />
                </div>
                <div className="stat-widget-value">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-footer" ref={userMenuRef}>
        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="user-menu-dropdown">
            <button className="user-menu-item">
              <User size={16} />
              <span>View Profile</span>
            </button>
            <button className="user-menu-item">
              <Settings size={16} />
              <span>Account Settings</span>
            </button>
            <button className="user-menu-item">
              <HelpCircle size={16} />
              <span>Support Help</span>
            </button>
            <div className="user-menu-divider" />
            <Link to="/login" className="user-menu-item logout no-underline">
              <LogOut size={16} />
              <span>Sign Out</span>
            </Link>
          </div>
        )}

        {/* User Profile Button */}
        <button 
          className="user-profile-btn"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="avatar">NR</div>
          <div className="user-info">
            <span className="user-name">Nachith Reddy</span>
            <span className="user-email">nachith@lumina.ai</span>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
