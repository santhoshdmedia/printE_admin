/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import { Avatar, Card, Divider, Rate, Spin, Tag, Tooltip } from "antd";
import DefaultTile from "../../components/DefaultTile";
import ColumnChart from "./ColumnChart";
import { ICON_HELPER } from "../../helper/iconhelper";
import TableView from "./TableView";
import { useNavigate } from "react-router-dom";
import { CiShare1 } from "react-icons/ci";
import { useEffect, useState } from "react";
import { CLIENT_URL, collectallorders, getAllDataCounts, getAllUserReviews, getClient } from "../../api";
import _ from "lodash";
import Chart from "react-google-charts";
import CountUp from "react-countup";
import PieChart from "./PieChart";
import { GET_DASHBOARD_COUNTS, GET_DASHBOARD_SUB_COUNTS } from "../../helper/data";

const Dashboard = () => {
  const navigate = useNavigate();

  // let counts = [
  //   {
  //     id: 1,
  //     name: "Products",
  //     count: 10,
  //   },
  //   {
  //     id: 2,
  //     name: "Orders",
  //     count: 20,
  //   },
  //   {
  //     id: 3,
  //     name: "Category",
  //     count: 30,
  //   },
  //   {
  //     id: 4,
  //     name: "Main Categories",
  //     count: 40,
  //   },
  //   {
  //     id: 5,
  //     name: "Sub Categories",
  //     count: 50,
  //   },
  //   {
  //     id: 6,
  //     name: "Product Categories",
  //     count: 60,
  //   },
  //   {
  //     id: 7,
  //     name: "Admin Users",
  //     count: 70,
  //   },
  //   {
  //     id: 7,
  //     name: "Customers",
  //     count: 80,
  //   },
  // ];
  const navigation = useNavigate();
  const [orderData, setOrderData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardCounts, setDashboardCounts] = useState([]);
  const [reviewData, setRviewData] = useState([]);
  // const [dummyCounts, setDummyCounts] = useState(counts);

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
        <Tag
          className="cursor-pointer flex items-center gap-2 hover:bg-orange-200 hover:border-orange-500 hover:text-orange-800"
          onClick={() => {
            navigation("/order_explore", {
              state: res?._id,
            });
          }}
        >
          Detail <CiShare1 />
        </Tag>
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
        return <Avatar className="!bg-primary !uppercase !text-white">{data?.split("")[0]}</Avatar>;
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
        return images ? (
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
        return imagePath ? <img src={imagePath} onClick={() => handleView(_.get(product_details, "[0].seo_url", ""))} alt="Product" className="w-16 h-16 object-cover rounded" /> : <span>No Image</span>;
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <DefaultTile title={"Dashboard"} />
      <div className="grid grid-cols-4 gap-2">
        {dashboardCounts
          .filter((res) => {
            return !_.get(res, "multiple", false);
          })
          .map((res, index) => {
            return (
              <div key={index} className="relative flex items-center justify-between px-4 bg-white h-[100px] rounded-lg hover:shadow-xl">
                <div>
                  <h1 className="!font-medium uppercase">{res.name}</h1>
                  <h1 className="!font-bold !text-primary !text-2xl">
                    <CountUp start={1} end={res.count} duration={1} />
                  </h1>
                </div>
                <Chart
                  data={[
                    ["", ""],
                    ["", res.count],
                  ]}
                  options={{ title: "bar chart", width: 80, height: 80 }}
                  chartType="Gauge"
                />
              </div>
            );
          })}
      </div>
      <div className="grid  grid-cols-2 !w-full gap-2 pt-2 dashboard">
        <ColumnChart
          title={"Categories"}
          dataSource={[
            ["", "Main Category", "Subcategory", "Product Category"],
            ["", GET_DASHBOARD_SUB_COUNTS("Main Categories", dashboardCounts), GET_DASHBOARD_SUB_COUNTS("Sub Categories", dashboardCounts), GET_DASHBOARD_SUB_COUNTS("Product Categories", dashboardCounts)],
          ]}
          color={["#818cf8", "#f59e0b", "#f43f5e"]}
          Icon={ICON_HELPER.CATEGORY_ICON}
        />

        <ColumnChart title={"Order Timeline Status"} dataSource={GET_DASHBOARD_COUNTS("Order Timeline", dashboardCounts)} color={["#e11d48", "#65a30d", "#0369a1", "#a21caf"]} Icon={ICON_HELPER.ORDERS_ICON} />
        <TableView loading={loading} column={customerColumns} dataSource={customerData} title={"Recent Five Customers"} Icon={ICON_HELPER.USER_ICON} />
        <ColumnChart title={"Admin Users"} dataSource={GET_DASHBOARD_COUNTS("Admin User Types", dashboardCounts)} color={["#e11d48", "#65a30d", "#0369a1", "#a21caf", "#a21caf"]} Icon={ICON_HELPER.ORDERS_ICON} />

        <PieChart title={"Product Types"} dataSource={GET_DASHBOARD_COUNTS("Product Types", dashboardCounts, true)} color={["#e11d48", "#65a30d"]} Icon={ICON_HELPER.PRODUCT_ICON} />
        <TableView loading={loading} column={orderColumns} dataSource={orderData} title={"Recent Five Orders"} Icon={ICON_HELPER.ORDERS_ICON} />
        <TableView loading={loading} column={reviewColumn} dataSource={reviewData} title={"Recent Five Reviews"} Icon={ICON_HELPER.ORDERS_ICON} />
      </div>
    </Spin>
  );
};

export default Dashboard;
