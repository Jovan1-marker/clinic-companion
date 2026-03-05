/**
 * ClinicSidebar - Reusable sidebar navigation for Student and Admin portals.
 * Uses the dark forest green theme from our design system.
 * 
 * Props:
 * - links: Array of navigation items with label, icon, and onClick
 * - title: Portal title displayed at the top
 * - activeLink: Currently active link label
 */
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { LucideIcon } from "lucide-react";

interface SidebarLink {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface ClinicSidebarProps {
  links: SidebarLink[];
  title: string;
  activeLink: string;
}

const ClinicSidebar = ({ links, title, activeLink }: ClinicSidebarProps) => {
  const navigate = useNavigate();

  /* Sign out and redirect to landing page */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-primary flex flex-col">
      {/* Portal title */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl font-bold text-primary-foreground">{title}</h2>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = activeLink === link.label;
          return (
            <button
              key={link.label}
              onClick={link.onClick}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-primary-foreground hover:bg-sidebar-accent"
                }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Logout button at the bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-primary-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default ClinicSidebar;
