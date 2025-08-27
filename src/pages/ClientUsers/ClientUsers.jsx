import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Empty, Spin, Table } from "antd";
import { getClient } from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import _ from "lodash";
import { MdDelete } from "react-icons/md";
import CustomTable from "../../components/CustomTable";
import { useNavigate } from "react-router-dom";
import { ICON_HELPER } from "../../helper/iconhelper";

const ClientUsers = () => {
  const [ClientUserData, setClientUserData] = useState([]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleView = (id) => {
    try {
      navigate("/user_details", { state: id });
    } catch {}
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      let searchData = {};
      const result = await getClient(JSON.stringify(searchData));
      setClientUserData(_.get(result, "data.data", []));
    } catch (error) {
      console.error("Error fetching admin data:", error);
      ERROR_NOTIFICATION(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);

  const deleteUserConfirm = (record) => {};

  const columns = [
    {
      title: "S.No",
      dataIndex: "_id",
      align: "center",
      render: (s, a, index) => {
        return <span>{index + 1}</span>;
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
    {
      title: "Mobile Number",
      dataIndex: "phone",
    },
    // {
    //   title: "Action",
    //   render: (text, record, index) => {
    //     return (
    //       <div className="flex gap-10">
    //         {
    //           <button className="text-red-500" onClick={() => deleteUserConfirm(record)}>
    //             <MdDelete size={20} />
    //           </button>
    //         }
    //       </div>
    //     );
    //   },
    // },
    {
      title: "Action",
      dataIndex: "_id",
      render: (data) => {
        return (
          <div
            onClick={() => {
              handleView(data);
            }}
          >
            <Button className="text-blue-600">View </Button>{" "}
          </div>
        );
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <DefaultTile title={"Customers"} />
        <div>
          {ClientUserData.length > 0 ? (
            <CustomTable dataSource={ClientUserData} columns={columns} />
          ) : (
            <div className="flex justify-center items-center min-h-[200px]">
              <Empty description="No Data Available" />
            </div>
          )}
        </div>
      </div>
    </Spin>
  );
};

export default ClientUsers;
