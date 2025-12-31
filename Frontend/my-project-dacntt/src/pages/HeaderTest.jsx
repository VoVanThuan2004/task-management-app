import { Bell, Search, Trash2 } from "lucide-react";
const HeaderTest = () => {
  return (
    <header className="bg-white border-b border-green-300 shadow-sm">
      <div className="flex items-center justify-between gap-6 h-18">
        <div className="flex items-center gap-3">
          <img
            src="../../public/logo.svg"
            alt="Plant Care Logo"
            className="w-8 h-8 text-green-600 ml-5"
          />
          <h1 className="text-xl font-semibold text-gray-900">Plant Care</h1>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="flex items-center bg-gray-100 rounded-full px-4">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search plants..."
              className="flex-1 bg-transparent py-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Bell className="w-5 h-5 cursor-pointer" />
          <img
            src="../../public/logo.svg"
            className="w-12 h-12 rounded-full cursor-pointer mr-5"
          />
        </div>
      </div>
    </header>
  );
};

export default HeaderTest;
