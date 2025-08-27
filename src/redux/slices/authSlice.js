import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: {
    name: "",
    _id: "",
    email: "",
    role: "",
    phone: "",
    profileImg:""
  },
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    isLoginSuccess: (state, action) => {
      state.user = action.payload;
    },
  },
});

export const { isLoginSuccess } = authSlice.actions;
export default authSlice.reducer;
