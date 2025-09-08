import { Avatar, Divider } from "antd";
import greetingTime from "greeting-time";
import { ICON_HELPER } from "../helper/iconhelper";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { isLoginSuccess } from "../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";

const TopNavbar = () => {
const {user} = useSelector((state)=>state.authSlice);
const profilePicName = user?.name[0]||""
const dispatch = useDispatch();
const navigate = useNavigate();
const handleLogout=()=>{
  localStorage.removeItem('admin_token')
  dispatch(isLoginSuccess({}))
  navigate('/')
}

  return (
    <div className="flex items-center justify-between size-full !h-[60px] px-4 bg-white">
      <h1 className="text-xl font-medium text-secondary">{greetingTime(new Date())} <span className="capitalize"> {user.name}</span> !</h1>
      <div className="flex items-center gap-x-2">
        <div className="center_div gap-x-2   font-medium text-secondary">
          <Avatar size="small" className="bg-secondary">
            {profilePicName}
          </Avatar>
          <h1 className="capitalize">{user.name}</h1>
        </div>
        <Divider type="vertical" />
        <div className="center_div gap-x-2  cursor-pointer  font-medium text-secondary" onClick={handleLogout}>
          <Avatar size="small">
            <ICON_HELPER.POWER_OFF className="!text-secondary" />
          </Avatar>
          <h1>Logout</h1>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
