import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
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
      { label: "Tele Calling", icon: PhoneCall }
    ]
  }
];

export function Sidebar() {
  return (
    <>
      <header className="border-b border-[#ECEFF3] bg-white lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-[18px] font-extrabold leading-none text-[#0F172A]">
                GrowEasy
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                Lead Sources
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#DDF5F1] px-3 py-1 text-[11px] font-bold text-[#216B62]">
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
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold ${
                  item.active
                    ? "bg-[#DDF5F1] text-[#216B62]"
                    : "bg-[#F5F6F7] text-[#3F4652]"
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[254px] border-r border-[#ECEFF3] bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">
          <div className="px-[24px] pb-[18px] pt-[29px]">
            <div className="flex items-center gap-[10px]">
              <LogoMark />
              <span className="text-[24px] font-extrabold leading-none tracking-[-0.015em] text-[#0F172A]">
                GrowEasy
              </span>
            </div>

            <button
              className="mt-[18px] flex h-[50px] w-full items-center gap-[10px] rounded-[14px] border border-[#ECEFF3] bg-white px-[10px] text-left transition hover:bg-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#216B62]"
              type="button"
            >
              <span className="h-[34px] w-[34px] shrink-0 rounded-[8px] bg-[#EFF2F1]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold leading-[17px] text-[#1F2937]">
                  AI
                </span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  Owner
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="h-[15px] w-[15px] text-[#B5BDC8]"
              />
            </button>
          </div>

          <nav
            aria-label="GrowEasy dashboard navigation"
            className="flex-1 overflow-y-auto px-[14px]"
          >
            {navGroups.map((group) => (
              <div className="mb-[24px]" key={group.label}>
                <p className="px-[12px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#B9BEC6]">
                  {group.label}
                </p>
                <div className="mt-[16px] space-y-[6px]">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <a
                        aria-current={item.active ? "page" : undefined}
                        className={`flex h-[38px] items-center gap-[12px] rounded-full px-[12px] text-[14px] font-semibold leading-none tracking-[-0.005em] transition ${
                          item.active
                            ? "bg-[#DDF5F1] text-[#216B62]"
                            : "text-[#3E4652] hover:bg-[#F6F7F8] hover:text-[#111827]"
                        }`}
                        href="#lead-sources"
                        key={item.label}
                      >
                        <Icon aria-hidden="true" className="h-[17px] w-[17px]" />
                        {item.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[#ECEFF3] px-[14px] py-[20px]">
            <button
              className="flex h-[40px] w-full items-center gap-[12px] rounded-[10px] px-[12px] text-[14px] font-semibold tracking-[-0.005em] text-[#3E4652] transition hover:bg-[#F6F7F8]"
              type="button"
            >
              <BriefcaseBusiness aria-hidden="true" className="h-[17px] w-[17px]" />
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
    <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[5px] bg-black text-white">
      <ArrowUpRight aria-hidden="true" className="h-[23px] w-[23px]" />
    </div>
  );
}
