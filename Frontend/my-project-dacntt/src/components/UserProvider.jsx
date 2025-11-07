import { useState, useEffect } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const httpUrl = import.meta.env.VITE_API_URL;

  const fetchUser = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return;
      const res = await axios.get(`${httpUrl}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser(res.data.data);
    } catch (error) {
      console.error("Fetch user failed:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};