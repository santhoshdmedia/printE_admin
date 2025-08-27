import { Collapse } from "antd";
import DefaultTile from "../../components/DefaultTile";
import MainCategory from "./MainCategory";
import SubCategory from "./SubCategory";
import React from "react";
import SubProductCategory from "./SubProductCategory";

const Category = () => {
  const ITEMS = [
    {
      id: 1,
      name: "Main Category",
      content: <MainCategory />,
    },
    {
      id: 2,
      name: "Sub Category",
      content: <SubCategory />,
    },
    {
      id: 3,
      name: "Product Category",
      content: <SubProductCategory />,
    },
  ];

  return (
    <div className="h-screen">
      <DefaultTile title={"Categories"} />
      <div className="flex items-center gap-x-2">
        <Collapse defaultActiveKey={[1, 2, 3]} className="w-full bg-white">
          {ITEMS.map((res) => (
            <Collapse.Panel key={res.id} header={res.name}>
              <div className="">{res.content}</div>
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>
    </div>
  );
};

export default Category;
