import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Receipt, CreditCard, Calendar, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentHistory = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalPaymentOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const navigate = useNavigate();

  const fetchPaymentHistory = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${httpUrl}/api/v1/payment-orders?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setOrders(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error("Lỗi tải lịch sử thanh toán:", err);
      setError("Không thể tải lịch sử thanh toán. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      navigate("/");
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPaymentHistory(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPaymentHistory(newPage);
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy 'lúc' HH:mm", {
      locale: vi,
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Nút Quay trở lại */}
        <button
          onClick={() => navigate("/home")}
          className="mb-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow transition-all text-gray-700 font-medium group"
        >
          <ArrowLeft
            size={20}
            className="text-gray-600 group-hover:-translate-x-1 transition"
          />
          <span>Quay trở lại</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header gradient */}
          <div className="bg-blue-500 p-8 text-center">
            
            <h1 className="text-3xl font-bold text-white">
              Lịch sử thanh toán
            </h1>
            <p className="text-white/80 mt-2 text-lg">
              Quản lý các giao dịch nâng cấp VIP của bạn
            </p>
          </div>

          {/* Body */}
          <div className="p-8">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 text-lg">{error}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <CreditCard size={40} className="text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg">
                  Bạn chưa có giao dịch nào
                </p>
                <p className="text-gray-500 mt-2">
                  Khi nâng cấp VIP, lịch sử sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <>
                {/* Danh sách giao dịch */}
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50/50"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                           
                            <div>
                              <p className="font-mono text-lg font-semibold text-blue-700">
                                {order.orderCode}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <CreditCard size={14} />
                                {order.paymentMethod}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar size={16} />
                              <span>Thanh toán:</span>
                              <span className="font-medium">
                                {formatDate(order.paymentDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock size={16} />
                              <span>Hết hạn:</span>
                              <span className="font-medium text-green-600">
                                {formatDate(order.expirationDate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            {formatAmount(order.amount)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Gói VIP 30 ngày
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phân trang */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-10">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      Trước
                    </button>

                    <span className="px-4 py-2 text-gray-700 font-medium">
                      Trang {pagination.page} / {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
