import { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserPlus, LayoutDashboard, DollarSign } from "lucide-react";
import { format, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNewUsers: 0,
    totalBoards: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const httpUrl = import.meta.env.VITE_API_URL;

  // States cho dashboard nâng cao
  const [advancedData, setAdvancedData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  const [filters, setFilters] = useState({
  type: "month", // mặc định theo tháng
  startDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"), // 1 tháng trước
  endDate: format(new Date(), "yyyy-MM-dd"), // hôm nay
});

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${httpUrl}/api/v1/dashboard-basic`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (response.data.status === "success") {
          setStats(response.data.data);
        } else {
          setError("Không thể tải dữ liệu dashboard");
        }
      } catch (err) {
        console.error("Lỗi tải dashboard:", err);
        setError("Lỗi kết nối. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
  };

  const statCards = [
    {
      title: "Tổng số người dùng",
      value: stats.totalUsers,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
      bgLight: "bg-white",
    },
    {
      title: "Người dùng mới (7 ngày)",
      value: stats.totalNewUsers,
      icon: UserPlus,
      color: "from-green-500 to-emerald-600",
      textColor: "text-green-600",
      bgLight: "bg-white",
    },
    {
      title: "Tổng số bảng",
      value: stats.totalBoards,
      icon: LayoutDashboard,
      color: "from-purple-500 to-indigo-600",
      textColor: "text-purple-600",
      bgLight: "bg-white",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "from-orange-500 to-red-600",
      textColor: "text-orange-600",
      bgLight: "bg-white",
    },
  ];

  // Fetch dữ liệu dashboard nâng cao
  const fetchAdvancedStats = async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const response = await axios.get(`${httpUrl}/api/v1/dashboard-advanced`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      setAdvancedData(response.data.data);
    } catch (err) {
      setChartError("Không thể tải biểu đồ thống kê");
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedStats();
  }, [filters]);

  // Màu cho biểu đồ tròn
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto ml-7">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            Dashboard Quản trị
          </h1>
          <p className="text-gray-600 mt-2">
            Theo dõi hiệu suất và hoạt động của hệ thống
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-pulse"
              >
                <div className="h-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600 text-xl">{error}</p>
          </div>
        ) : (
          /* Stats Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl border border-gray-200
                 shadow-sm hover:shadow-xl transition-all duration-300
                 hover:-translate-y-1"
              >
                <div
                  className={`bg-gradient-to-r ${stat.color}
                    p-6 rounded-2xl h-full`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left content */}
                    <div>
                      <p className="text-white/80 text-sm font-medium tracking-wide">
                        {stat.title}
                      </p>
                      <p className="text-4xl font-extrabold mt-3 text-white">
                        {stat.value}
                      </p>
                    </div>

                    {/* Icon */}
                    <div
                      className="flex items-center justify-center
                       w-14 h-14 rounded-2xl
                       bg-white/20 backdrop-blur
                       group-hover:scale-110 transition-transform"
                    >
                      <stat.icon size={28} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== DASHBOARD NÂNG CAO ==================== */}
        <div className="mt-16 ml-7">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={32} className="text-blue-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Thống kê doanh thu chi tiết
            </h2>
          </div>

          {/* Bộ lọc */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thống kê
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="week">Theo tuần</option>
                  <option value="month">Theo tháng</option>
                  <option value="quarter">Theo quý</option>
                  <option value="year">Theo năm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Biểu đồ */}
          {chartLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-sm border p-8 animate-pulse">
                <div className="h-96 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-8 animate-pulse">
                <div className="h-96 bg-gray-200 rounded-xl mx-auto w-96"></div>
              </div>
            </div>
          ) : chartError ? (
            <div className="text-center py-12 text-red-600">{chartError}</div>
          ) : advancedData.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-xl">Không có dữ liệu trong khoảng thời gian này</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Biểu đồ cột - Doanh thu theo thời gian */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Doanh thu theo {filters.type === "week" ? "tuần" : filters.type === "month" ? "tháng" : filters.type === "quarter" ? "quý" : "năm"}
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={advancedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="label"
                      angle={advancedData.length > 6 ? -45 : 0}
                      textAnchor={advancedData.length > 6 ? "end" : "middle"}
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="totalRevenue" name="Tổng doanh thu" fill="#FD9346" radius={[8, 8, 0, 0]} barSize={120} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Biểu đồ tròn - Tỷ lệ doanh thu */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Tỷ lệ doanh thu từng kỳ
                </h3>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={advancedData}
                        dataKey="totalRevenue"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                       
                      >
                        {advancedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default DashboardPage;
