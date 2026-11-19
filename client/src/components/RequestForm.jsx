import { useState } from "react";
import api from "../api";

const DEPARTMENTS = ["Engineering", "Design", "QA", "Product", "Operations"];
const TYPES = ["Work From Home", "Annual Leave", "Sick Leave", "Half Day"];

const emptyForm = {
  employeeName: "",
  department: "",
  type: "",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function RequestForm({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.endDate < form.startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/requests", form);
      onCreated(data);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded border border-gray-300 p-2";

  return (
    <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">Submit a Request</h2>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="employeeName" className="mb-1 block text-sm font-medium">
          Employee Name
        </label>
        <input
          id="employeeName"
          name="employeeName"
          value={form.employeeName}
          onChange={handleChange}
          required
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="department" className="mb-1 block text-sm font-medium">
            Department
          </label>
          <select
            id="department"
            name="department"
            value={form.department}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Request Type
          </label>
          <select
            id="type"
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value="">Select type</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="startDate" className="mb-1 block text-sm font-medium">
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="endDate" className="mb-1 block text-sm font-medium">
            End Date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          required
          rows={3}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}