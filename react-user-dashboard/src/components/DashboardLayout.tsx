import { useState } from "react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { PanelLeft, PanelLeftClose } from "lucide-react"

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  return (
    <div className="flex min-h-screen bg-[#0b0c0e]">
      {/* Fixed Sidebar */}
      <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between sticky top-0 bg-[#0b0c0e]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
              onClick={toggleSidebar}
              title={isCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Header links removed as requested */}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
