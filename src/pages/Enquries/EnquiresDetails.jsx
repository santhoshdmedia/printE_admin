import React, { useEffect } from "react";
import DefaultTile from "../../components/DefaultTile";
import { getSingelInquires } from "../../api";
import _ from "lodash";
import { useLocation } from "react-router-dom";

const EnquiresDetails = () => {
  const location = useLocation();

  let searchData = { _id: location?.state };

  const fetchData = async () => {
    try {
      const result = await getSingelInquires(JSON.stringify(searchData));
      const data = _.get(result, "data.data", "");
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  });

  return (
    <div>
      <DefaultTile title={"Enquires"} />
    </div>
  );
};

export default EnquiresDetails;
