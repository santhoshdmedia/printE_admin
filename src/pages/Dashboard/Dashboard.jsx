/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import { Avatar, Card, Divider, Rate, Spin, Tag, Tooltip } from "antd";
import DefaultTile from "../../components/DefaultTile";
// import ColumnChart from "./ColumnChart";
import MixedChart from "./MixedChart";
import { ICON_HELPER } from "../../helper/iconhelper";
import TableView from "./TableView";
import { useNavigate } from "react-router-dom";
import { CiShare1 } from "react-icons/ci";
import { useEffect, useState } from "react";
import { CLIENT_URL, collectallorders, getAllDataCounts, getAllUserReviews, getClient } from "../../api";
import _ from "lodash";

import CountUp from "react-countup";
import PieChart from "./PieChart";
import { GET_DASHBOARD_COUNTS, GET_DASHBOARD_SUB_COUNTS } from "../../helper/data";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiBox, FiShoppingCart, FiUsers, FiStar, 
  FiPieChart, FiBarChart2, FiTrendingUp 
} from "react-icons/fi";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const navigation = useNavigate();
  const [orderData, setOrderData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardCounts, setDashboardCounts] = useState([]);
  const [reviewData, setRviewData] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const ordersData = async () => {
    try {
      setLoading(true);
      let searchData = {
        search: "",
        limit: true,
      };
      const result = await collectallorders(JSON.stringify(searchData));
      const data = _.get(result, "data.data", []);
      setOrderData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ordersData();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      let searchData = {
        limit: true,
      };
      const result = await getClient(JSON.stringify(searchData));
      setCustomerData(_.get(result, "data.data", []));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUser();
  }, []);

  const getDataCounts = async () => {
    try {
      setLoading(true);
      const result = await getAllDataCounts();
      setDashboardCounts(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchreviewData = async () => {
    try {
      setLoading(true);
      const result = await getAllUserReviews();
      setRviewData(_.get(result, "data.data", ""));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getDataCounts();
    fetchreviewData();
  }, []);

  const handleView = (url) => {
    console.log(url);
    window.open(`${CLIENT_URL}/product/${url}`);
  };
  const userRole=JSON.parse(localStorage.getItem('userprofile'))
  

  const orderColumns = [
    {
      title: "S. No",
      align: "center",
      width: 100,
      render: (_, __, index) => <span>{index + 1}</span>,
    },
    {
      title: "Invoice No.",
      dataIndex: "invoice_no",
      align: "center",
    },
    {
      title: "Amount",
      dataIndex: "total_price",
      width: 150,
      render: (amount) => <div className="!font-medium !text-primary ">₹ {amount}</div>,
    },
    {
      title: "Order Date",
      dataIndex: "createdAt",
      align: "center",
      render: (date) => <span>{new Date(date).toLocaleDateString()}</span>,
    },
    {
      title: "Details",
      key: "details",
      render: (res) => (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Tag
            className="cursor-pointer flex items-center gap-2 hover:bg-orange-200 hover:border-orange-500 hover:text-orange-800 transition-all duration-300"
            onClick={() => {
              navigation("/order_explore", {
                state: res?._id,
              });
            }}
          >
            Detail <CiShare1 />
          </Tag>
        </motion.div>
      ),
    },
  ];

  const customerColumns = [
    {
      title: "S.No",
      dataIndex: "_id",
      align: "center",
      render: (s, a, index) => {
        return <span>{index + 1}</span>;
      },
    },
    {
      title: "Pic",
      dataIndex: "name",
      render: (data) => {
        return (
          <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
            <Avatar className="!bg-primary !uppercase !text-white">{data?.split("")[0]}</Avatar>
          </motion.div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
  ];

  const reviewColumn = [
    {
      title: "S.no",
      dataIndex: "_id",
      align: "center",
      render: (s, a, index) => <span>{index + 1}</span>,
    },
    {
      title: "User",
      dataIndex: "user_data",
      align: "center",
      render: (user_data) => {
        console.log(user_data);
        const images = _.get(user_data, "[0].profile_pic", null);
        const userName = _.get(user_data, "[0].name", "");
        const firstLetter = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
            {images ? (
              <img
                src={images}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover hover:cursor-pointer"
                onClick={() => {
                  navigate("/user_details", { state: user_data[0]._id });
                }}
              />
            ) : (
              <span
                onClick={() => {
                  navigate("/user_details", { state: user_data[0]._id });
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold"
              >
                {firstLetter}
              </span>
            )}
          </motion.div>
        );
      },
    },
    {
      title: "Rating",
      dataIndex: "rating",
      align: "center",
      render: (rating) => {
        return (
          <span>
            <Rate disabled value={rating} className="text-[13px]" />
          </span>
        );
      },
    },
    {
      title: "Review",
      dataIndex: "review",
      align: "center",
      render: (review) => {
        return <span className="line-clamp-1">{review}</span>;
      },
    },
    {
      title: "Product",
      dataIndex: "Product_details",
      align: "center",
      render: (product_details) => {
        const imagePath = _.get(product_details, "[0].images[0].path", null);
        return (
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
            {imagePath ? (
              <img 
                src={imagePath} 
                onClick={() => handleView(_.get(product_details, "[0].seo_url", ""))} 
                alt="Product" 
                className="w-16 h-16 object-cover rounded cursor-pointer" 
              />
            ) : (
              <span>No Image</span>
            )}
          </motion.div>
        );
      },
    },
  ];

  // Icon mapping for dashboard cards
  const getIconForCard = (name) => {
    switch(name) {
      case "Products": return <FiBox className="card-icon" />;
      case "Orders": return <FiShoppingCart className="card-icon" />;
      case "Category": return <FiPieChart className="card-icon" />;
      case "Main Categories": return <FiBarChart2 className="card-icon" />;
      case "Sub Categories": return <FiTrendingUp className="card-icon" />;
      case "Product Categories": return <FiPieChart className="card-icon" />;
      case "Admin Users": return <FiUsers className="card-icon" />;
      case "Customers": return <FiUsers className="card-icon" />;
      default: return <FiBox className="card-icon" />;
    }
  };

  return (
    <Spin spinning={loading}>
      <DefaultTile title={"Dashboard"} />
      
      {/* Animated Stats Cards */}
      {userRole.role=="super admin"&&
        <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {dashboardCounts
          .filter((res) => !_.get(res, "multiple", false))
          .map((res, index) => {
            return (
              <motion.div
                key={index}
                className="stats-card bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{res.name}</p>
                    <h2 className="text-2xl font-bold text-primary mt-2">
                      <CountUp start={0} end={res.count} duration={2} separator="," />
                    </h2>
                  </div>
                  <div className="text-2xl text-primary opacity-80">
                    {getIconForCard(res.name)}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      className="bg-primary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (res.count / 100) * 100)}%` }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
      </motion.div>

      }
      {/* Main Dashboard Grid */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Categories Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <MixedChart
            chart="pie"
            title={"Categories"}
            dataSource={[
              ["", "Main Category", "Subcategory", "Product Category"],
              ["", GET_DASHBOARD_SUB_COUNTS("Main Categories", dashboardCounts), GET_DASHBOARD_SUB_COUNTS("Sub Categories", dashboardCounts), GET_DASHBOARD_SUB_COUNTS("Product Categories", dashboardCounts)],
            ]}
            color={["#818cf8", "#f59e0b", "#f43f5e"]}
            Icon={ICON_HELPER.CATEGORY_ICON}
          />
        </motion.div>

        {/* Order Timeline Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <MixedChart 
            chart="area"
            title={"Order Timeline Status"} 
            dataSource={GET_DASHBOARD_COUNTS("Order Timeline", dashboardCounts)} 
            color={["#e11d48", "#65a30d", "#0369a1", "#a21caf"]} 
            Icon={ICON_HELPER.ORDERS_ICON} 
          />
        </motion.div>

       

        {/* Admin Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <MixedChart 
          chart={'bar'}
            title={"Admin Users"} 
            dataSource={GET_DASHBOARD_COUNTS("Admin User Types", dashboardCounts)} 
            color={["#e11d48", "#65a30d", "#0369a1", "#a21caf", "#a21caf"]} 
            Icon={ICON_HELPER.ORDERS_ICON} 
          />
        </motion.div>

        {/* Product Types */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <PieChart 
            title={"Product Types"} 
            dataSource={GET_DASHBOARD_COUNTS("Product Types", dashboardCounts, true)} 
            color={["#e11d48", "#65a30d"]} 
            Icon={ICON_HELPER.PRODUCT_ICON} 
          />
        </motion.div>

        {/* Recent Five Orders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <TableView 
            loading={loading} 
            column={orderColumns} 
            dataSource={orderData} 
            title={"Recent Five Orders"} 
            Icon={ICON_HELPER.ORDERS_ICON} 
          />
        </motion.div>

        {/* Recent Five Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <TableView 
            loading={loading} 
            column={reviewColumn} 
            dataSource={reviewData} 
            title={"Recent Five Reviews"} 
            Icon={ICON_HELPER.ORDERS_ICON} 
          />
        </motion.div>
      </motion.div>
    </Spin>
  );
};

export default Dashboard;