import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUserProfile } from "../store/userSlice";

export default function AuthInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch]);

  return null;
}
