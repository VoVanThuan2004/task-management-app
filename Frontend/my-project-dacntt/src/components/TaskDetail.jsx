import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TaskModal from "./TaskModal";
import axios from "axios";
const httpUrl = import.meta.env.VITE_API_URL;
const accessToken = localStorage.getItem("accessToken");

const TaskDetail = () => {
  const { boardId, title, taskId } = useParams(); // lấy params từ URL
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const fetchBoardDetails = async () => {
      try {
        const headers = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};

        const res = await axios.get(
          `${httpUrl}/api/v1/boards-detail/${boardId}`,
          { headers }
        );

        const { isMember } = res.data.data;

        setIsMember(isMember || false); 

        console.log(isMember);
      } catch (err) {
        const status = err.response?.status;
        // Chỉ redirect khi thật sự không được phép
        if (status === 401 || status === 403) {
          // Nếu là public board → backend sẽ trả 200 + isMember=false → không vào đây
          // Chỉ vào đây khi là private/workspace mà không có quyền
          alert("Bạn không có quyền truy cập bảng này");
          window.location.href = "/";
        } else if (status === 404) {
          alert("Bảng không tồn tại");
          window.location.href = "/";
        }
      }
    };

    fetchBoardDetails();
  }, [boardId, taskId, accessToken]);

  // Fetch task data dựa trên taskId 
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await axios.get(`${httpUrl}/api/v1/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setTaskData(res.data.data);
      } catch (error) {
        console.error(error);
        navigate(-1); // nếu lỗi, back về board
      }
    };
    fetchTask();
  }, [taskId, navigate]);

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
