/* eslint-disable react/prop-types */
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from "framer-motion";
import { useEffect, useState } from 'react';

const MixedChart = ({ chart, dataSource, color = false, title, Icon }) => {
  const [activeTab, setActiveTab] = useState('bar');
  
  useEffect(()=>{
    setActiveTab(chart)
  },[])
  // Transform data for different visualizations
  const transformData = () => {
    if (!dataSource || dataSource.length < 2) return [];
    
    const headers = dataSource[0];
    const rows = dataSource.slice(1);
    
    return headers
      .filter((header, index) => index > 0 && header !== "")
      .map((header, index) => {
        const value = rows[0] ? rows[0][index + 1] : 0;
        return {
          name: header,
          value: value,
          fill: color && color[index] ? color[index] : defaultColors[index % defaultColors.length]
        };
      });
  };

  const chartData = transformData();
  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

  // For area/line charts
  const timeSeriesData = [
    { name: 'Jan', value: 45, value2: 30 },
    { name: 'Feb', value: 52, value2: 38 },
    { name: 'Mar', value: 49, value2: 42 },
    { name: 'Apr', value: 58, value2: 48 },
    { name: 'May', value: 65, value2: 55 },
    { name: 'Jun', value: 72, value2: 62 },
  ];

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

  // Render chart based on active tab
  const renderChart = () => {
    switch(activeTab) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#6366F1" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );   
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                animationDuration={1500}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'radial':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="20%" 
              outerRadius="90%" 
              data={chartData} 
              startAngle={0} 
              endAngle={360}
              barSize={20}
            >
              <RadialBar
                minAngle={15}
                background={{ fill: '#F3F4F6', stroke: '#E5E7EB', strokeWidth: 1 }}
                dataKey="value"
                animationDuration={1500}
                cornerRadius={8}
                label={{ position: 'insideStart', fill: '#fff' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </RadialBar>
              <Legend 
                iconSize={10}
                iconType="circle"
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: '10px', color: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#6366F1" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
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
            className="p-3 rounded-xl bg-indigo-500 text-white shadow-md"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Icon />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        </div>
        
        {/* Chart type selector */}
        {/* <div className="flex bg-gray-100 rounded-lg p-1">
          {['bar', 'area', 'pie', 'radial'].map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                activeTab === tab 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div> */}
      </div>
      
      <div className="p-5 h-[420px] relative">
        {chartData.length > 0 ? (
          renderChart()
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div 
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
        <span>Updated just now</span>
        <div className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          <span>Viewing: {activeTab}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default MixedChart;