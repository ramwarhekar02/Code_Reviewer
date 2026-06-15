export default function ToggleSwitch({ enabled, onChange, label, labelRight, size = "sm" }) {
  const sizes = {
    sm: { track: "w-9 h-5", thumb: "w-3.5 h-3.5", translate: "translate-x-4" },
    md: { track: "w-11 h-6", thumb: "w-4 h-4", translate: "translate-x-5" }
  };
  const s = sizes[size];

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      {label && <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>}
      <div className={`relative ${s.track} rounded-full transition-colors duration-200 ${
        enabled ? "bg-emerald-500" : "bg-white/10"
      }`}>
        <div className={`absolute top-0.5 left-0.5 ${s.thumb} bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? s.translate : "translate-x-0"
        }`} />
        <input type="checkbox" checked={enabled} onChange={onChange} className="sr-only" />
      </div>
      {labelRight && <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{labelRight}</span>}
    </label>
  );
}
