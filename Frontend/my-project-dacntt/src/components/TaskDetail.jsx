import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TaskModal from "./TaskModal";
import axios from "axios";
import toast from "react-hot-toast";
const httpUrl = import.meta.env.VITE_API_URL;

const TaskDetail = () => {
  const { boardId, title, taskId } = useParams(); // lấy params từ URL
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchBoardDetails = async () => {

      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        const res = await axios.get(
          `${httpUrl}/api/v1/boards-detail/${boardId}`,
          { headers }
        );

        const { isMember } = res.data.data;
        setIsMember(isMember || false);
      } catch (err) {
        const status = err.response?.status;

        if (status === 401 || status === 403) {
          toast.error("Bạn không có quyền truy cập bảng này");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else if (status === 404) {
          toast.error("Bảng không tồn tại");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        }
      }
    };

    fetchBoardDetails();
  }, [boardId, taskId, accessToken, navigate]);

  // Fetch task data dựa trên taskId
  useEffect(() => {
    if (!accessToken) {
      toast.error("Bạn cần đăng nhập để xem công việc này");
      setTimeout(() => {
        navigate("/");
      }, 1500);
      return;
    }

    const fetchTask = async () => {
      try {
        const res = await axios.get(`${httpUrl}/api/v1/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setTaskData(res.data.data);
      } catch (error) {
        toast.error("Không thể tải công việc");
        navigate(-1);
        console.log(error);
      }
    };

    fetchTask();
  }, [taskId, accessToken, navigate]);

  // Hàm đóng modal → back về board URL
  const handleClose = () => {
    navigate(`/boards/${boardId}/${title}`); // back về board mà không reload
  };

  // Render modal với data task
  return (
    <TaskModal
      task={taskData}
      isOpen={true} // luôn mở vì URL match
      onClose={handleClose}
      isMember={isMember}
    />
  );
};

export default TaskDetail;
