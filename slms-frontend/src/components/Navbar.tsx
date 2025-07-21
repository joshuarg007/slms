import { logout } from "../utils/auth";

const Navbar = () => {
  return (
    <nav className="bg-indigo-600 text-white px-6 py-3 flex justify-between items-center shadow">
      <h1 className="text-xl font-semibold">SLMS</h1>
      <button
        onClick={logout}
        className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm"
      >
        Logout
      </button>
    </nav>
  );
};

export default Navbar;
