import React, { useEffect } from "react";

const WidgetTestPage: React.FC = () => {
  useEffect(() => {
    const form = document.getElementById("leadForm") as HTMLFormElement;
    const handler = async (e: Event) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("http://127.0.0.1:8000/public/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        alert("Server response: " + JSON.stringify(result));
      } catch {
        alert("Error submitting lead.");
      }
    };

    form?.addEventListener("submit", handler);
    return () => form?.removeEventListener("submit", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h2 className="text-2xl font-bold mb-4">Test Public Lead Widget</h2>

      <form id="leadForm" className="space-y-4 max-w-md bg-white p-6 rounded shadow">
        <input name="name" placeholder="Name" required className="w-full border p-2" />
        <input name="email" placeholder="Email" type="email" required className="w-full border p-2" />
        <input name="phone" placeholder="Phone" className="w-full border p-2" />
        <input name="company" placeholder="Company" className="w-full border p-2" />
        <textarea name="notes" placeholder="Notes" className="w-full border p-2"></textarea>
        <input name="source" placeholder="Source" className="w-full border p-2" />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Submit</button>
      </form>
    </div>
  );
};

export default WidgetTestPage;
