import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CLIENT_URL, getSingleClient } from "../../api";
import { Card, Spin, Tabs, Rate, Empty, Collapse, Modal, Form } from "antd";
import _ from "lodash";
import moment from "moment";
import DefaultTile from "../../components/DefaultTile";
import Breadcrumbs from "../../components/Breadcrumbs";

const ClientUsersDetails = () => {
  const { TabPane } = Tabs;
  const { Panel } = Collapse;
  const location = useLocation();
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form] = Form.useForm();

  let searchData = { _id: location?.state };

  const fetchData = async () => {
    try {
      const result = await getSingleClient(JSON.stringify(searchData));
      const data = _.get(result, "data.data", null);
      setUserData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(
    () => {
      fetchData();
    },
    [location?.state],
    []
  );

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Spin size="large" />
      </div>
    );

  const handleView = (url) => {
    window.open(`${CLIENT_URL}/product/${url}`);
  };

  const handaleClose = () => {
    form.resetFields();
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <div>
      <DefaultTile title={"User Details"} />
      <div className="pt-4 pl-1">
        <Breadcrumbs title={"User Details"} />
      </div>
      <div className="-pt-5">
        <Collapse accordion defaultActiveKey={["1"]} className="bg-white shadow-lg rounded-lg">
          <Panel header="Contact Info" className="text-sm">
            {userData.map((res, index) => {
              const profilePic = _.get(res, "profile_pic", "");
              const userName = _.get(res, "name", " ");

              const normalAddress = _.get(res, "addresses[0]", null);

              const deliveryAddress = _.get(res, "order_details[0].delivery_address", null);

              const addressToShow = normalAddress || deliveryAddress;

              return (
                <div key={index} className="flex items-center p-6 border rounded-lg shadow-lg bg-white">
                  <div className="w-[80px] h-[80px] flex-shrink-0">{profilePic ? <img src={profilePic} className="w-full h-full rounded-lg" alt="User Profile" /> : <div className="w-full h-full flex items-center justify-center rounded-lg bg-primary text-3xl font-bold text-white">{userName.charAt(0).toUpperCase()}</div>}</div>

                  <div className="ml-4">
                    <h1 className="text-lg font-semibold">{res.name}</h1>
                    <p className="text-gray-500">{res.email}</p>

                    {addressToShow && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>{normalAddress ? "Address" : "Delivery Address"}:</strong>
                        <p>
                          {addressToShow.street}, {addressToShow.city}, {addressToShow.state} - {addressToShow.pincode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel header="Order Info" key="2" className="text-sm ">
            {userData?.some((res) => res.order_details.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {userData?.map((res, index) =>
                  res.order_details.map(
                    (order, orderIndex) => (
                      console.log(order),
                      (
                        <Card key={`${index}-${orderIndex}`} className="p-6 shadow-lg rounded-lg bg-white space-y-3">
                          <div>
                            <h4 className="mt-4 font-semibold text-gray-800">Products:</h4>
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-md shadow-sm">
                              <img src={order.cart_items.product_image} alt={order.cart_items.product_name} className="w-[60px] h-[60px] object-cover rounded-md" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{order.cart_items.product_name}</p>
                                <p className="text-sm text-gray-600">Price: ₹{order.cart_items.product_price}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-sm text-gray-600">
                              <strong>Order Id:</strong> {order.invoice_no}
                            </h3>
                            <p className="text-sm text-gray-600">
                              <strong>Status: </strong>
                              <span className="font-medium text-blue-600">{order.order_status}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Payment Method:</strong> {order.payment_method}
                            </p>
                            <p className="text-sm text-gray-600 space-x-5">
                              <strong>Date: </strong>
                              {moment(order.createdAt).format("DD MMM YYYY")}, <strong>Time :</strong>
                              {moment(order.createdAt).format("hh:mm A")}
                            </p>
                          </div>

                          <div className="space-y-2 justify-between text-sm font-medium mt-2">
                            <p className="text-gray-700">
                              <strong>Delivery price</strong> <span className="text-red-600">₹{order.delivery_price}</span>
                            </p>
                            <p className="text-gray-700">
                              <strong>Total price</strong> <span className="text-green-600">₹{order.total_price}</span>
                            </p>
                          </div>

                          <div className="rounded-md mt-2">
                            <p className="text-sm text-gray-700 space-y-4">
                              <strong>Delivery Address:</strong> {order.delivery_address?.street}, {order.delivery_address?.locality}, {order.delivery_address?.city}
                            </p>
                          </div>
                        </Card>
                      )
                    )
                  )
                )}
              </div>
            ) : (
              <div className="flex justify-center items-center py-10">
                <Empty description="No Order History Available" />
              </div>
            )}
          </Panel>

          <Panel header="Review Info" key="3" className="text-sm ">
            {userData?.some((res) => _.get(res, "review_details", []).length > 0) ? (
              <div className="space-y-4">
                {userData.map((res, index) => {
                  const reviews = _.get(res, "review_details", []);

                  return (
                    reviews.length > 0 && (
                      <div key={index} className="space-y-4">
                        {reviews.map((review, reviewIndex) => (
                          <div key={reviewIndex} className="flex gap-5 items-center justify-between bg-white shadow-md rounded-lg p-4">
                            <div className="flex-1">
                              <Rate disabled value={_.get(review, "rating", 0)} className="mt-1 text-primary text-sm" />
                              <p className="text-[12px] text-secondary mt-1">{moment(res.createdAt).format("MMM DD, YYYY")}</p>
                            </div>

                            <div className="flex-1 px-4 border-l border-r border-gray-200">
                              <p className="text-sm line-clamp-2  text-gray-700">{_.get(review, "review", "No review provided")}</p>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedReview(review.review);
                                  setIsModalOpen(true);
                                }}
                                className="text-sm text-blue-500 hover:underline mt-2 inline-block"
                              >
                                Read More...
                              </a>
                            </div>

                            <div className="flex-shrink-0">
                              <img src={_.get(review, "product_details[0].images[0].path", "")} onClick={() => handleView(_.get(review, "product_details[0].seo_url", ""))} alt="Product" className="w-16 h-16 rounded-lg object-cover shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center items-center py-10">
                <Empty description="No Reviews Available" />
              </div>
            )}
          </Panel>
        </Collapse>
      </div>
      <Modal title="Full Review" open={isModalOpen} onCancel={handaleClose} footer={null}>
        <p className="text-gray-700">{selectedReview}</p>
      </Modal>
    </div>
  );
};

export default ClientUsersDetails;
