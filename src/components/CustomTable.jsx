/* eslint-disable react/prop-types */
import { Table } from "antd";
import _ from "lodash";
import React, { useEffect, useState } from "react";

const CustomTable = ({ dataSource, columns, filter = [], loading, padding = true }) => {
  const [availableColumns, setAvailableColumns] = useState(columns);
  const [dummy, setDummy] = useState(false);

  useEffect(() => {
    if (!_.isEmpty(filter)) {
      let filteredColumns = columns?.filter((res) => {
        return !filter.includes(res.title);
      });
      setAvailableColumns(filteredColumns);
      setDummy(!dummy);
    }
  }, [filter]);

  return (
    <div className={`bg-white ${padding ? "p-5" : "py-5"} rounded-lg`}>
      <Table scroll={{ x: 800 }} loading={loading} dataSource={dataSource} columns={availableColumns} pagination={padding ? { pageSize: 7, position: ["bottomCenter"], size: "small" } : false} />
    </div>
  );
};

export default CustomTable;
