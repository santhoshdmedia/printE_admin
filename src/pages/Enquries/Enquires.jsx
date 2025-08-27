import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { getInquires } from "../../api";
import { ICON_HELPER } from "../../helper/iconhelper";
import _ from "lodash";
import { Divider } from "antd";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { SUCCESS_NOTIFICATION } from "../../helper/notification_helper";

const Enquires = () => {
  const [data, setData] = useState([]);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const result = await getInquires();
      const data = _.get(result, "data.data", "");
      setData(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // const handleClick = (id) => {
  //   try {
  //     navigate("/enquires-details", { state: id });
  //   } catch (err) {}
  // };

  return (
    <div>
      <DefaultTile title={"Enquires"} />
      <div className="p-2 w-full bg-white rounded-lg">
        <div>
          {data.map((item, index) => (
            <div
              key={index}
              // onClick={() => {
              //   handleClick(item._id);
              // }}
              className=""
            >
              <div className="flex items-center p-1 space-x-4  ">
                <ICON_HELPER.MAIL_ICON className="text-primary text-[30px]" />
                <div className="flex w-full justify-between items-center  ">
                  <div className=" items-start  w-[70%]">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-600">{item.message}</p>
                  </div>
                  <div className="flex items-center space-x-6  pr-4">
                    <p className="text-sm">{moment(item.updatedAt).format("MMM Do YYYY, h:mm:ss")}</p>
                  </div>
                </div>
              </div>
              <Divider />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Enquires;
