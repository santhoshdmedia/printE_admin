import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { useParams } from "react-router-dom";
import { getSingleVendor } from "../../api";
import { ERROR_NOTIFICATION } from "../../helper/notification_helper";
import _ from "lodash";
import { Breadcrumb, Descriptions, Image } from "antd";
import Breadcrumbs from "../../components/Breadcrumbs";

const VendorDetails = () => {
  const { id } = useParams();

  const [currentVendor, setCurrentVendor] = useState();

  const fetchSingleVendor = async () => {
    try {
      const result = await getSingleVendor(id);
      setCurrentVendor(_.get(result, "data.data", null));
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  useEffect(() => {
    fetchSingleVendor();
  }, [id]);

  const column = [
    {
      key: "1",
      label: "Vendor ID",
      children: _.get(currentVendor, "unique_code", ""),
    },
    {
      key: "2",
      label: "Vendor Name",
      children: _.get(currentVendor, "vendor_name", ""),
    },
    {
      key: "8",
      label: "Logo",
      children: <Image className="!size-[100px] !object-cover" src={_.get(currentVendor, "vendor_image", "")} />,
    },
    {
      key: "3",
      label: "Vendor Email",
      children: _.get(currentVendor, "vendor_email", ""),
    },
    {
      key: "4",
      label: "Vendor Contact Number",
      children: _.get(currentVendor, "vendor_contact_number", ""),
    },
    {
      key: "5",
      label: "Vendor Alternate Contact Number",
      children: _.get(currentVendor, "alternate_vendor_contact_number", ""),
    },
    {
      key: "6",
      label: "Vendor Business Or Store Name",
      children: _.get(currentVendor, "business_name", ""),
    },
    {
      key: "7",
      label: "Vendor Business Or Store Address",
      children: _.get(currentVendor, "business_address", ""),
    },
  ];

  return (
    <div>
      <DefaultTile title={"Vendor Details"} />
      <div className="bg-white rounded-lg min-h-fit p-10">
        <Breadcrumbs title={"Vendor Details"} />
        <Descriptions items={column} layout="vertical" bordered />
      </div>
    </div>
  );
};

export default VendorDetails;
