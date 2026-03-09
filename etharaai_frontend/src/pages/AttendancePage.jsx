import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { getAttendanceByEmployee, markAttendance } from "../api/attendance";
import { getEmployees } from "../api/employees";
import AttendanceForm from "../components/Attendance/AttendanceForm";
import AttendanceTable from "../components/Attendance/AttendanceTable";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [activeTab, setActiveTab] = useState("mark"); // "mark" | "history"

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data);
    } catch {
      /* supplementary */
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (filterEmployee) {
        // Fetch attendance for a specific employee
        const res = await getAttendanceByEmployee(
          filterEmployee,
          filterDate || undefined,
        );
        setRecords(res.data);
      } else {
        // No global attendance endpoint — fetch for all employees and merge
        if (employees.length === 0) {
          setRecords([]);
        } else {
          const allRecords = [];
          for (const emp of employees) {
            try {
              const res = await getAttendanceByEmployee(
                emp.employee_id,
                filterDate || undefined,
              );
              allRecords.push(...res.data);
            } catch {
              // skip if error for individual employee
            }
          }
          // Sort by date descending
          allRecords.sort((a, b) => b.date.localeCompare(a.date));
          setRecords(allRecords);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [filterEmployee, filterDate, employees]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  useEffect(() => {
    if (employees.length > 0 || filterEmployee) {
      fetchRecords();
    } else {
      setLoading(false);
    }
  }, [employees, filterEmployee, filterDate, fetchRecords]);

  const handleMark = async (data) => {
    try {
      await markAttendance(data);
      toast.success("Attendance marked!");
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark attendance.");
      throw err;
    }
  };

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          paddingBottom: 0,
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          gap: "32px",
          justifyContent: "flex-start",
          marginBottom: "32px",
        }}
      >
        <button
          onClick={() => setActiveTab("mark")}
          style={{
            background: "transparent",
            border: "none",
            padding: "16px 4px",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            color:
              activeTab === "mark" ? "var(--text-main)" : "var(--text-muted)",
            borderBottom:
              activeTab === "mark"
                ? "3px solid var(--primary)"
                : "3px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s",
          }}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            background: "transparent",
            border: "none",
            padding: "16px 4px",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            color:
              activeTab === "history"
                ? "var(--text-main)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "history"
                ? "3px solid var(--primary)"
                : "3px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.2s",
          }}
        >
          Attendance History
        </button>
      </div>

      {activeTab === "mark" && (
        <AttendanceForm employees={employees} onSubmit={handleMark} />
      )}

      {activeTab === "history" && (
        <div className="card">
          <h3 style={{ display: "none" }}>Attendance History</h3>

          <div className="filter-bar">
            <div className="form-group">
              <label htmlFor="filter-emp">Employee</label>
              <select
                id="filter-emp"
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employee_id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="filter-date">Date</label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>

          {loading && <Loader />}
          {error && <ErrorState message={error} onRetry={fetchRecords} />}
          {!loading && !error && records.length === 0 && (
            <EmptyState message="No attendance records found." />
          )}
          {!loading && !error && records.length > 0 && (
            <AttendanceTable records={records} />
          )}
        </div>
      )}
    </div>
  );
}
