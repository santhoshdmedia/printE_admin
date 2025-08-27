/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Layout, Menu, theme } from "antd";
import { Outlet, useHref, useNavigate } from "react-router-dom";
import { MENU_DATA } from "../helper/data";
import _ from "lodash";
import { isLoginSuccess } from "../redux/slices/authSlice";
import { admintoken } from "../helper/notification_helper";
import { checkloginstatus } from "../api";
import { useDispatch, useSelector } from "react-redux";
import TopNavbar from "../components/TopNavbar";
import { IMAGE_HELPER } from "../helper/imagehelper";
const { Header, Content, Footer, Sider } = Layout;
function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}
const items = [
  getItem("Option 1", "1", <PieChartOutlined />),
  getItem("Option 2", "2", <DesktopOutlined />),
  getItem("User", "sub1", <UserOutlined />, [
    getItem("Tom", "3"),
    getItem("Bill", "4"),
    getItem("Alex", "5"),
  ]),
  getItem("Team", "sub2", <TeamOutlined />, [
    getItem("Team 1", "6"),
    getItem("Team 2", "8"),
  ]),
  getItem("Files", "9", <FileOutlined />),
];

const menu_datas = [];

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const path = useHref();
  const dispatch = useDispatch();
  const [new_menu_data, setNew_menu_data] = useState(MENU_DATA);
  const { user } = useSelector((state) => state.authSlice);

  const [open, setOpen] = useState([]);
  useEffect(() => {
    const updatedMenuData = MENU_DATA.filter((menu) => {
      return menu.for.includes(user.role);
    });
    setNew_menu_data(updatedMenuData);
  }, [user]);

  const fetchdata = async () => {
    try {
      const result = await checkloginstatus();
      const data = _.get(result, "data.data", "");
      dispatch(isLoginSuccess(data));
      if (_.isEmpty(data)) {
        localStorage.removeItem(admintoken);
        return navigate("/");
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchdata();
  }, []);

  useEffect(() => {
    if (["/categories/main-category"].includes(path)) {
      setOpen([4]);
    }
  }, []);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleClick = (to) => {
    try {
      navigate(to);
    } catch (err) {}
  };

  const logocolors = [
    IMAGE_HELPER.color1,
    IMAGE_HELPER.color2,
    IMAGE_HELPER.color3,
    IMAGE_HELPER.color4,
    IMAGE_HELPER.color5,
    IMAGE_HELPER.color6,
    IMAGE_HELPER.color7,
    IMAGE_HELPER.color8,
    IMAGE_HELPER.color9,
    IMAGE_HELPER.color10,
    IMAGE_HELPER.color11,
    IMAGE_HELPER.color12,
    IMAGE_HELPER.color13,
    IMAGE_HELPER.color14,
    IMAGE_HELPER.color15,
    IMAGE_HELPER.color16,
    IMAGE_HELPER.color17,
  ];

  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex((prevIndex) => (prevIndex + 1) % logocolors.length);
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout
      style={{
        Height: "100vh",
      }}
    >
      <Sider
        collapsible
        collapsed={collapsed}
        color="green"
        onCollapse={(value) => setCollapsed(value)}
        className="!h-screen !bg-white overflow-scroll"
      >
        <div className="center_div rounded h-[50px]">
          <div className="flex flex-row items-center ">
            {collapsed ? (
              <img
                src={logocolors[currentColorIndex]}
                alt=""
                className="w-auto h-[35px] bg-center bg-contain"
              />
            ) : (
              <>
                {" "}
                <img
                  src={IMAGE_HELPER.logo}
                  alt=""
                  className="w-auto h-[35px] bg-center bg-contain"
                />
                <img
                  src={logocolors[currentColorIndex]}
                  alt=""
                  className="w-auto h-[35px] bg-center bg-contain"
                />
              </>
            )}
          </div>
        </div>
        <Menu mode="vertical" className="!bg-white pb-20">
          {new_menu_data.map((res, index) => {
            return !_.isEmpty(_.get(res, "children", [])) ? (
              <Menu.SubMenu
                className={` ${
                  res.special?.includes(path?.split("/")[1])
                    ? "!bg-primary !text-white"
                    : ""
                } `}
                title={res.name}
                key={index}
                icon={<res.icon />}
              >
                {_.get(res, "children", []).map((child) => {
                  return (
                    <Menu.Item
                      className={` ${
                        child.special?.includes(path?.split("/")[2])
                          ? "!bg-primary !text-white"
                          : ""
                      } `}
                      onClick={() => {
                        handleClick(child.to);
                      }}
                      key={child.id}
                      icon={<res.icon />}
                    >
                      {child.name}
                    </Menu.Item>
                  );
                })}
              </Menu.SubMenu>
            ) : (
              <Menu.Item
                onClick={() => {
                  handleClick(res.to);
                }}
                className={`${
                  res.special?.includes(path?.split("/")[1])
                    ? "!bg-primary !text-white"
                    : ""
                } `}
                key={index}
                icon={<res.icon />}
              >
                {res.name}
              </Menu.Item>
            );
          })}
        </Menu>
      </Sider>
      <Layout className="!h-screen overflow-hidden">
        <TopNavbar />
        <div className="!h-screen overflow-scroll p-5 bg-[#f5f4a9]">
          <Outlet />
        </div>
      </Layout>
    </Layout>
  );
};
export default App;
