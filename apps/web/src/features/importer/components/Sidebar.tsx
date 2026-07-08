import {
  BriefcaseBusiness,
  ChevronRight,
  Code2,
  Columns3,
  Database,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Rocket,
  UserPlus,
  Users
} from "lucide-react";

const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Generate Leads", icon: Rocket },
      { label: "Manage Leads", icon: Database },
      { label: "Engage Leads", icon: MessageSquare }
    ]
  },
  {
    label: "Control Center",
    items: [
      { label: "Team Members", icon: Users },
      { label: "Lead Sources", icon: Megaphone, active: true },
      { label: "Ad Accounts", icon: UserPlus },
      { label: "WhatsApp Account", icon: MessageCircle },
      { label: "Tele Calling", icon: PhoneCall },
      { label: "CRM Fields", icon: Columns3 },
      { label: "API Center", icon: Code2 }
    ]
  }
];

export function Sidebar() {
  return (
    <>
      <header className="border-b border-[#E5E7EB] bg-white lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-lg font-bold text-[#111827]">GrowEasy</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Lead Sources
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#DDF5F1] px-3 py-1 text-xs font-bold text-[#0F766E]">
            CSV Import
          </span>
        </div>
        <nav
          aria-label="GrowEasy mobile navigation"
          className="flex gap-2 overflow-x-auto px-4 pb-4"
        >
          {navGroups.flatMap((group) => group.items).map((item) => {
            const Icon = item.icon;

            return (
              <a
                aria-current={item.active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                  item.active
                    ? "bg-[#DDF5F1] text-[#0F766E]"
                    : "bg-[#F3F4F6] text-[#374151]"
                }`}
                href="#lead-sources"
                key={item.label}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      <aside className="hidden border-r border-[#E5E7EB] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[304px] lg:shrink-0 lg:flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#F3F4F6] px-5 py-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-2xl font-bold tracking-normal text-[#111827]">
              GrowEasy
            </span>
          </div>

          <button
            className="mt-6 flex w-full items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 text-left transition hover:border-[#BFE7E0] hover:bg-[#F8FCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            type="button"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#DDF5F1] text-[#0F766E]">
              <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#111827]">
                GrowEasy AI
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Sales Manager
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="h-5 w-5 text-[#9CA3AF]" />
          </button>
        </div>

        <nav
          aria-label="GrowEasy dashboard navigation"
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          {navGroups.map((group) => (
            <div className="mb-7" key={group.label}>
              <p className="px-3 text-xs font-bold uppercase tracking-[0.18em] text-[#C4C4C4]">
                {group.label}
              </p>
              <div className="mt-3 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      aria-current={item.active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition ${
                        item.active
                          ? "bg-[#DDF5F1] text-[#0F766E]"
                          : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]"
                      }`}
                      href="#lead-sources"
                      key={item.label}
                    >
                      <Icon aria-hidden="true" className="h-5 w-5" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#E5E7EB] p-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
            type="button"
          >
            <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
            Business Center
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white">
      <ChevronRight aria-hidden="true" className="h-6 w-6 -rotate-45" />
    </div>
  );
}
