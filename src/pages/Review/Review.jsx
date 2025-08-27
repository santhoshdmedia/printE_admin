import React, { useEffect, useState } from "react";
import { Modal, Rate, Form, Spin } from "antd";
import DefaultTile from "../../components/DefaultTile";
import { CLIENT_URL, getAllUserReviews } from "../../api";
import _ from "lodash";
import moment from "moment";
import { useNavigate } from "react-router-dom";

const Review = () => {
  const [reviewdata, setRviewData] = useState([]);
  const [search, setSearch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  const fetchData = async (search) => {
    try {
      setLoading(true);
      const result = await getAllUserReviews(search);
      const data = _.get(result, "data.data", "");
      setRviewData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handaleClose = () => {
    form.resetFields();
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  useEffect(() => {
    fetchData(search);
  }, [search]);

  return (
    <Spin spinning={loading}>
      <div>
        <DefaultTile title={"Reviews"} search={true} setSearch={setSearch} />
        <div className="p-6 bg-transparent min-h-screen">
          <div className="space-y-4">
            {reviewdata.map((res, index) => (
              <div key={index} className="flex gap-5 items-center justify-between bg-transparent shadow-md rounded-lg p-4">
                <div className="hover:cursor-pointer" onClick={() => navigate("/user_details", { state: res.user_data[0]._id })}>
                  {_.get(res, "user_data[0].profile_pic", "") ? <img src={_.get(res, "user_data[0].profile_pic", "")} alt="User" className="w-12 h-12 rounded-lg object-cover shadow-md" /> : <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-white font-bold shadow-md">{_.get(res, "user_data[0].name", "").charAt(0).toUpperCase()}</div>}
                </div>

                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-800">{_.get(res, "user_data[0].name", "")}</h2>
                  <Rate disabled value={res.rating} className="mt-1 text-primary text-sm" />
                  <p className="text-[12px] text-secondary mt-1">{moment(res.createdAt).format("MMM DD, YYYY")}</p>
                </div>

                <div className="flex-1 px-4 border-l border-r border-gray-200">
                  <p className="text-sm text-gray-700 line-clamp-1">{res.review}</p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedReview(res.review);
                      setIsModalOpen(true);
                    }}
                    className="text-sm text-yellow-500 hover:underline mt-2 inline-block"
                  >
                    Read More...
                  </a>
                </div>

                <div className="flex-shrink-0 hover:cursor-pointer" onClick={() => window.open(`${CLIENT_URL}/product/${_.get(res, "Product_details[0].seo_url", "")}`)}>
                  <img src={_.get(res, "Product_details[0].images[0].path", "")} alt="Product" className="w-16 h-16 rounded-lg object-cover shadow-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Modal title="Full Review" open={isModalOpen} onCancel={handaleClose} footer={null}>
          <p className="text-gray-700">{selectedReview}</p>
        </Modal>
      </div>
    </Spin>
  );
};

export default Review;
