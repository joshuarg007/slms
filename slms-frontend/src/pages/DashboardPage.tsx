import Navbar from "../components/Navbar";

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold">Welcome to the SLMS Dashboard</h1>
      </div>
    </div>
  );
};

export default DashboardPage;
