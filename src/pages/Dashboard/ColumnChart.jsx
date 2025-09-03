/* eslint-disable react/prop-types */
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { motion } from "framer-motion";
import { useEffect, useState } from 'react';

// Line Chart Component
export const LineChartComponent = ({ dataSource, color = false, title, Icon }) => {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    // Transform data for line chart
    const transformData = () => {
      if (!dataSource || dataSource.length < 2) return [];
      
      const headers = dataSource[0];
      const rows = dataSource.slice(1);
      
      // For line charts, we typically need time-series data
      // If data is already in time-series format, use it directly
      if (headers[0].toLowerCase().includes('date') || headers[0].toLowerCase().includes('time')) {
        return rows.map((row, index) => {
          const obj = {};
          headers.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        });
      }
      
      // If data is categorical, create a simple line from values
      return headers
        .filter((header, index) => index > 0 && header !== "")
        .map((header, index) => {
          const value = rows[0] ? rows[0][index + 1] : 0;
          return {
            name: header,
            value: value,
          };
        });
    };

    setChartData(transformData());
  }, [dataSource]);

  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];
  const lineColor = color && color.length > 0 ? color[0] : defaultColors[0];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 shadow-xl rounded-lg border border-gray-200"
        >
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center mb-1">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: <span className="font-semibold ml-1">{entry.value}</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  // Custom animated dot
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={4}
        fill={lineColor}
        stroke="#fff"
        strokeWidth={2}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.5, transition: { duration: 0.2 } }}
      />
    );
  };

  return (
    <motion.div 
      className="h-[500px] bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-3 rounded-xl bg-blue-500 text-white shadow-md"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Icon />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        </div>
        <motion.div 
          className="flex items-center"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2 
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
          <span className="text-xs text-gray-500">Trending</span>
        </motion.div>
      </div>
      
      <div className="p-5 h-[420px] relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ 
                  value: 'Value', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { fill: '#64748b', fontSize: 12 } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#colorLine)"
                strokeWidth={3}
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: lineColor }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div 
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="text-gray-500">Loading line chart data...</p>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
        <span>Updated just now</span>
        <div className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          <span>Live data</span>
        </div>
      </div>
    </motion.div>
  );
};

// Area Chart Component
export const AreaChartComponent = ({ dataSource, color = false, title, Icon }) => {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    // Transform data for area chart
    const transformData = () => {
      if (!dataSource || dataSource.length < 2) return [];
      
      const headers = dataSource[0];
      const rows = dataSource.slice(1);
      
      // For area charts, we typically need time-series data
      // If data is already in time-series format, use it directly
      if (headers[0].toLowerCase().includes('date') || headers[0].toLowerCase().includes('time')) {
        return rows.map((row, index) => {
          const obj = {};
          headers.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        });
      }
      
      // If data is categorical, create a simple area from values
      return headers
        .filter((header, index) => index > 0 && header !== "")
        .map((header, index) => {
          const value = rows[0] ? rows[0][index + 1] : 0;
          return {
            name: header,
            value: value,
          };
        });
    };

    setChartData(transformData());
  }, [dataSource]);

  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];
  const areaColor = color && color.length > 0 ? color[0] : defaultColors[0];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 shadow-xl rounded-lg border border-gray-200"
        >
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center mb-1">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: <span className="font-semibold ml-1">{entry.value}</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className="h-[500px] bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-3 rounded-xl bg-green-500 text-white shadow-md"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Icon />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        </div>
        <motion.div 
          className="flex items-center"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2 
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
          <span className="text-xs text-gray-500">Cumulative</span>
        </motion.div>
      </div>
      
      <div className="p-5 h-[420px] relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ 
                  value: 'Value', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { fill: '#64748b', fontSize: 12 } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={areaColor}
                strokeWidth={2}
                fill="url(#colorArea)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div 
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="text-gray-500">Loading area chart data...</p>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
        <span>Updated just now</span>
        <div className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          <span>Live data</span>
        </div>
      </div>
    </motion.div>
  );
};

// Multi-Line Chart Component for comparing multiple data series
export const MultiLineChartComponent = ({ dataSource, color = false, title, Icon }) => {
  const [chartData, setChartData] = useState([]);
  const [dataKeys, setDataKeys] = useState([]);
  
  useEffect(() => {
    // Transform data for multi-line chart
    const transformData = () => {
      if (!dataSource || dataSource.length < 2) return [[], []];
      
      const headers = dataSource[0];
      const rows = dataSource.slice(1);
      
      // Extract data keys (excluding the first column which is typically labels)
      const keys = headers.filter((header, index) => index > 0 && header !== "");
      setDataKeys(keys);
      
      // Format data for multi-line chart
      return rows.map((row, index) => {
        const obj = { name: `Item ${index + 1}` };
        headers.forEach((header, i) => {
          if (i > 0) {
            obj[header] = row[i];
          }
        });
        return obj;
      });
    };

    const [transformedData, keys] = transformData();
    setChartData(transformedData);
    setDataKeys(keys);
  }, [dataSource]);

  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];
  const lineColors = color && color.length > 0 ? color : defaultColors;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 shadow-xl rounded-lg border border-gray-200"
        >
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center mb-1">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: <span className="font-semibold ml-1">{entry.value}</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className="h-[500px] bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-3 rounded-xl bg-purple-500 text-white shadow-md"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Icon />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        </div>
        <motion.div 
          className="flex items-center"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2 
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
          <span className="text-xs text-gray-500">Multi-series</span>
        </motion.div>
      </div>
      
      <div className="p-5 h-[420px] relative">
        {chartData.length > 0 && dataKeys.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ 
                  value: 'Value', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { fill: '#64748b', fontSize: 12 } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div 
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="text-gray-500">Loading multi-line chart data...</p>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
        <span>Updated just now</span>
        <div className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          <span>{dataKeys.length} data series</span>
        </div>
      </div>
    </motion.div>
  );
};