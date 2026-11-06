import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const fetchUserProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return rejectWithValue("Chưa đăng nhập");
    }

    try {
      const res = await axios.get(`${API_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  },
  {
    condition: (_, { getState }) => getState().user.status !== "loading",
  }
);

const initialState = {
  profile: null,
  isAuthenticated: Boolean(localStorage.getItem("accessToken")),
  status: "idle",
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.profile = {
        ...state.profile,
        ...action.payload,
      };
      state.isAuthenticated = true;
      state.status = "succeeded";
      state.error = null;
    },
    setUser: (state, action) => {
      state.profile = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.status = "succeeded";
      state.error = null;
    },
    clearUser: (state) => {
      state.profile = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
    },
    updateProfileFields: (state, action) => {
      if (state.profile) {
        state.profile = {
          ...state.profile,
          ...action.payload // Nhận vào object chứa các field cần sửa
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.isAuthenticated = true;
        state.status = "succeeded";
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { loginSuccess, setUser, clearUser, updateProfileFields } = userSlice.actions;

export const selectUser = (state) => state.user.profile;
export const selectIsAuthenticated = (state) => state.user.isAuthenticated;
export const selectUserStatus = (state) => state.user.status;

export default userSlice.reducer;
