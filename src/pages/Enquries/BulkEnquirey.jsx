import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { getBulkInquires } from "../../api";
import { ICON_HELPER } from "../../helper/iconhelper";
import _ from "lodash";
import { Divider, Tag, Avatar, Card, Badge } from "antd";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { SUCCESS_NOTIFICATION } from "../../helper/notification_helper";

// Safe icon component with fallback
const SafeIcon = ({ icon: IconComponent, fallback, className, ...props }) => {
  if (IconComponent && typeof IconComponent === 'function') {
    return <IconComponent className={className} {...props} />;
  }
  return fallback || <span className={className}>📧</span>;
};

const BulkEnquirey = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getBulkInquires();
      const data = _.get(result, "data.data", "");
      setData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    const statusMap = {
      pending: "orange",
      completed: "green",
      new: "blue",
      cancelled: "red"
    };
    return statusMap[status] || "default";
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DefaultTile title={"Bulk Enquiries"} />
      
      <div className="p-4 lg:p-6">
        <Card 
          className="shadow-lg border-0 rounded-2xl"
          loading={loading}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Recent Enquiries
            </h2>
            <p className="text-gray-600">
              {data.length} enquiry{data.length !== 1 ? 'ies' : ''} found
            </p>
          </div>

          <div className="space-y-4">
            {data.map((item, index) => (
              <div
                key={index}
                className="group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                      <Badge 
                        count={item.quantity} 
                        size="small"
                        color="#1890ff"
                      >
                        <Avatar
                          size={56}
                          icon={<SafeIcon icon={ICON_HELPER.MAIL_ICON} />}
                          className="bg-gradient-to-br from-blue-500 to-purple-600 shadow-md flex items-center justify-center"
                        />
                      </Badge>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                            {item.product_name || "Unknown Product"}
                          </h3>
                          
                          <div className="flex flex-wrap gap-4 mb-3">
                            {/* Email */}
                            <div className="flex items-center gap-2 text-gray-600">
                              <SafeIcon 
                                icon={ICON_HELPER.USER_ICON} 
                                fallback="👤"
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{item.email || "No email"}</span>
                            </div>
                            
                            {/* Phone */}
                            <div className="flex items-center gap-2 text-gray-600">
                              <SafeIcon 
                                icon={ICON_HELPER.PHONE_ICON} 
                                fallback="📞"
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{item.mobile}</span>
                            </div>
                            
                            {/* Quantity */}
                            <div className="flex items-center gap-2 text-gray-600">
                              <SafeIcon 
                                icon={ICON_HELPER.PACKAGE_ICON} 
                                fallback="📦"
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-blue-600">
                                {item.quantity || 0} units
                              </span>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2">
                            <Tag color="blue" className="rounded-full px-3 py-1 text-xs">
                              Bulk Order
                            </Tag>
                            <Tag color="green" className="rounded-full px-3 py-1 text-xs">
                              Priority
                            </Tag>
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {moment(item.updatedAt).format("MMM Do YYYY")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {moment(item.updatedAt).format("h:mm A")}
                            </p>
                          </div>
                          
                          <Tag 
                            color={getStatusColor(item.status)} 
                            className="rounded-full px-3 py-1 text-xs font-semibold"
                          >
                            {item.status || "New"}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Urgency */}
                  {/* <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: item.urgency === 'high' ? '90%' : 
                                 item.urgency === 'medium' ? '60%' : '30%' 
                        }}
                      ></div>
                    </div>
                  </div> */}
                </div>

                {/* Subtle divider - only between items */}
                {index < data.length - 1 && (
                  <Divider className="my-4 opacity-30" />
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {!loading && data.length === 0 && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <SafeIcon 
                  icon={ICON_HELPER.MAIL_ICON} 
                  fallback="📧"
                  className="text-6xl text-gray-300"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-500 mb-2">
                No Enquiries Found
              </h3>
              <p className="text-gray-400">
                There are no bulk enquiries at the moment.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BulkEnquirey;