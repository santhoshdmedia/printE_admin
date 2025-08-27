/* eslint-disable react/prop-types */
import { Chart } from "react-google-charts";

const PieChart = ({ dataSource, color = false, title, Icon }) => {
  const options = {
    legend: { position: "bottom" },
    colors: color,
    hAxis: { title: "" },
    vAxis: { title: "Count" },
  };

  return (
    <div className="h-[500px] bg-white  rounded-lg border-8 border-white">
      <h1 className="!text-lg font-medium rounded-lg px-2 justify-start gap-x-2 h-[50px]  bg-white text-primary center_div">
        <Icon /> {title}
      </h1>
      <Chart chartType={"PieChart"} data={dataSource} options={options} width="100%" height="400px" />
    </div>
  );
};

export default PieChart;
