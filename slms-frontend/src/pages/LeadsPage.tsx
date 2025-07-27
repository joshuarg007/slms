import React, { useEffect, useState } from "react";

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("No access token found");
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/leads", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch leads");
        }

        const data = await response.json();
        setLeads(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Lead Submissions</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: any, index: number) => (
              <tr key={lead.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="px-4 py-2">{lead.name || "-"}</td>
                <td className="px-4 py-2">{lead.email || "-"}</td>
                <td className="px-4 py-2">{lead.phone || "-"}</td>
                <td className="px-4 py-2">{lead.company || "-"}</td>
                <td className="px-4 py-2">{lead.source || "-"}</td>
                <td className="px-4 py-2">{lead.notes || "-"}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsPage;
