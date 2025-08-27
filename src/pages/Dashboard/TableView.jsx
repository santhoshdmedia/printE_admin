/* eslint-disable react/prop-types */
import CustomTable from "../../components/CustomTable";

const TableView = ({ title, Icon, column, dataSource, loading }) => {
  return (
    <div className="!h-[500px] overflow-hidden bg-white  rounded-lg border-8 border-white">
      <h1 className="!text-lg font-medium rounded-lg px-2 justify-start gap-x-2 h-[50px]  bg-white text-primary center_div">
        <Icon /> {title}
      </h1>
      <CustomTable padding={false} loading={loading} columns={column} dataSource={dataSource} />
    </div>
  );
};

export default TableView;
