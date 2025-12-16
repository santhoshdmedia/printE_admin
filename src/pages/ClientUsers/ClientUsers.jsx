import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Empty, Spin, Table } from "antd";
import { getClient } from "../../api";
import { ERROR_NOTIFICATION } from "../../helper/notification_helper";
import _ from "lodash";
import { useNavigate } from "react-router-dom";

const ClientUsers = () => {
  const [clientUserData, setClientUserData] = useState([]);
  const [sortedData, setSortedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

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
      const data = _.get(result, "data.data", []);
      
      // Sort data by creation date (newest first) or by _id if no createdAt
      const sorted = _.orderBy(
        data, 
        ['createdAt', '_id'], 
        ['desc', 'desc']
      );
      
      setClientUserData(sorted);
      setSortedData(sorted);
      setPagination({
        ...pagination,
        total: sorted.length,
      });
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

  const columns = [
    {
      title: "S.No",
      key: "sno",
      align: "center",
      width: 80,
      render: (text, record, index) => {
        const { current, pageSize, total } = pagination;
        // Calculate serial number for newest-first order
        // Newest record (index 0 on page 1) should be 1
        // Formula: total - ((current-1)*pageSize + index)
        const globalIndex = (current - 1) * pageSize + index;
        return <span>{total - globalIndex}</span>;
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      // sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: "Email",
      dataIndex: "email",
      // sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
    },
    {
      title: "Mobile Number",
      dataIndex: "phone",
      // sorter: (a, b) => (a.phone || "").localeCompare(b.phone || ""),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      render: (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      },
      // sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => {
        return (
          <Button 
            className="text-blue-600"
            onClick={() => handleView(record._id)}
          >
            View
          </Button>
        );
      },
    },
  ];

  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    
    // If you want to handle sorting locally
    if (sorter.field) {
      const data = [...clientUserData];
      const sorted = _.orderBy(
        data,
        [sorter.field],
        [sorter.order === 'ascend' ? 'asc' : 'desc']
      );
      setSortedData(sorted);
    } else {
      // Reset to default sorting (newest first)
      const data = [...clientUserData];
      const sorted = _.orderBy(data, ['createdAt', '_id'], ['desc', 'desc']);
      setSortedData(sorted);
    }
  };

  return (
    <Spin spinning={loading}>
      <div>
        <DefaultTile title={"Customers"} />
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-lg font-semibold">
            Total Customers: <span className="text-blue-600">{pagination.total}</span>
          </p>
        </div>
        <div className="p-2"> 
          {sortedData.length > 0 ? (
            <Table 
              dataSource={sortedData} 
              columns={columns}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '30', '50'],
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} customers`,
              }}
              rowKey="_id"
              onChange={handleTableChange}
              bordered
            />
          ) : (
            <div className="flex justify-center items-center min-h-[200px]">
              <Empty description="No Customers Available" />
            </div>
          )}
        </div>
      </div>
    </Spin>
  );
};

export default ClientUsers;