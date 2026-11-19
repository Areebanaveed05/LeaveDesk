export default function Spinner({ label = "Loading..." }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 p-6 text-gray-600"
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      <span>{label}</span>
    </div>
  );
}