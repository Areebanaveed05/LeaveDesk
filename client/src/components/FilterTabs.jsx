
const TABS = [
  {
    label: "All",
    active: "bg-[#E8F0FA] text-[#52749B] border-[#C9D9EE] shadow-sm",
    inactive: "bg-[#E8F0FA]/60 text-[#52749B] hover:bg-[#E8F0FA]",
  },
  {
    label: "Pending",
    active: "bg-[#F8F2D9] text-[#89783D] border-[#E9DFAF] shadow-sm",
    inactive: "bg-[#F8F2D9]/60 text-[#89783D] hover:bg-[#F8F2D9]",
  },
  {
    label: "Approved",
    active: "bg-[#E3F1E8] text-[#527D61] border-[#C9E2D1] shadow-sm",
    inactive: "bg-[#E3F1E8]/60 text-[#527D61] hover:bg-[#E3F1E8]",
  },
  {
    label: "Rejected",
    active: "bg-[#FCE5E5] text-[#B54343] border-[#F3CACA] shadow-sm",
    inactive: "bg-[#FCE5E5]/60 text-[#B54343] hover:bg-[#FCE5E5]",
  },
];

export default function FilterTabs({ active, onChange, counts }) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-3"
      role="tablist"
      aria-label="Filter leave requests"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.label;

        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.label)}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
              isActive ? tab.active : tab.inactive
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-80">
              ({counts[tab.label]})
            </span>
          </button>
        );
      })}
    </div>
  );
}
