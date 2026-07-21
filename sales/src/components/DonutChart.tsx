import React, { useState } from'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from'recharts';

interface DonutChartProps {
 data: any[];
 dataKey?: string;
 nameKey?: string;
 colors?: string[];
 title?: string;
 centerLabel?: string;
}

const renderActiveShape = (props: any) => {
 const RADIAN = Math.PI / 180;
 const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
 const sin = Math.sin(-RADIAN * midAngle);
 const cos = Math.cos(-RADIAN * midAngle);
 const sx = cx + (outerRadius + 10) * cos;
 const sy = cy + (outerRadius + 10) * sin;
 const mx = cx + (outerRadius + 30) * cos;
 const my = cy + (outerRadius + 30) * sin;
 const ex = mx + (cos >= 0 ? 1 : -1) * 22;
 const ey = my;
 const textAnchor = cos >= 0 ? 'start' : 'end';

 return (
 <g>
 <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#888" fontSize={12} fontWeight={500}>
 {payload.name}
 </text>
 <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#333" fontSize={18} fontWeight={700}>
 {value}
 </text>
 <Sector
 cx={cx}
 cy={cy}
 innerRadius={innerRadius}
 outerRadius={outerRadius + 6}
 startAngle={startAngle}
 endAngle={endAngle}
 fill={fill}
 />
 <Sector
 cx={cx}
 cy={cy}
 startAngle={startAngle}
 endAngle={endAngle}
 innerRadius={outerRadius + 8}
 outerRadius={outerRadius + 10}
 fill={fill}
 />
 </g>
 );
};

export default function DonutChart({ 
 data, 
 dataKey = "value", 
 nameKey = "name", 
 colors = ['#1677ff','#52c41a','#fa8c16','#AF52DE','#ff4d4f','#5856D6','#30B0C7'],
 centerLabel
}: DonutChartProps) {
 const [activeIndex, setActiveIndex] = useState(0);

 const onPieEnter = (_: any, index: number) => {
 setActiveIndex(index);
 };

 return (
 <div className="w-full h-full flex flex-col">
 <div className="flex-1 relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 activeIndex={activeIndex}
 activeShape={renderActiveShape}
 data={data}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 dataKey={dataKey}
 nameKey={nameKey}
 onMouseEnter={onPieEnter}
 paddingAngle={5}
 stroke="none"
 >
 {data.map((entry, index) => (
 <Cell 
 key={`cell-${index}`} 
 fill={colors[index % colors.length]} 
 className="transition-all duration-300 hover:opacity-80"
 />
 ))}
 </Pie>
 <Tooltip 
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 const total = data.reduce((acc, item) => acc + (item[dataKey] || 0), 0);
 const percent = payload[0].payload.percent !== undefined 
 ? payload[0].payload.percent 
 : (payload[0].value / (total || 1));
 
 return (
 <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{payload[0].name}</p>
 <p className="text-lg font-bold text-gray-900">{payload[0].value.toLocaleString()}</p>
 <p className="text-[10px] font-bold text-[#1677ff]">{(percent * 100).toFixed(1)}% of total</p>
 </div>
 );
 }
 return null;
 }}
 />
 </PieChart>
 </ResponsiveContainer>
 </div>
 
 <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
 {data.map((item, index) => (
 <div 
 key={item[nameKey]} 
 className={`flex items-center gap-2 cursor-pointer transition-all ${activeIndex === index ? 'opacity-100' : 'opacity-60'}`}
 onMouseEnter={() => setActiveIndex(index)}
 >
 <div 
 className="w-2.5 h-2.5 rounded-full" 
 style={{ backgroundColor: colors[index % colors.length] }} 
 />
 <span className="text-[11px] font-bold text-gray-600 truncate">{item[nameKey]}</span>
 <span className="text-[10px] font-medium text-gray-400 ml-auto">{item[dataKey]}</span>
 </div>
 ))}
 </div>
 </div>
 );
}
