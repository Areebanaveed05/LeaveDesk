const TABS = ["All", "Pending", "Approved"];

export default function FilterTabs({ active, onChange, counts }) {
  return (
    <div className="mb-4 flex gap-2" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`rounded px-3 py-1 text-sm font-medium ${
            active === tab
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {tab} ({counts[tab]})
        </button>
      ))}
    </div>
  );
}