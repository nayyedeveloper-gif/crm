import React, { useMemo, memo } from'react';
import { motion } from'motion/react';
import { DataRow } from'../types';
import { getExtractedReason } from'../utils';

interface SummaryCardsProps {
 data: DataRow[];
}

function SummaryCards({ data }: SummaryCardsProps) {
 const { totalGram, totalAmount, totalQty, saleStats, rcStats, rpStats } = useMemo(() => {
 let gramSum = 0;
 let amountSum = 0;
 let qtySum = 0;

 const sale = { gram: 0, amount: 0, qty: 0 };
 const rc = { gram: 0, amount: 0, qty: 0 };
 const rp = { gram: 0, amount: 0, qty: 0 };

 data.forEach((row) => {
 const reason = getExtractedReason(row);
 const gram = parseFloat(row['Gram'] ||'0');
 const g = isNaN(gram) ? 0 : gram;
 gramSum += g;

 const amount = parseFloat(row['Voucher Amount'] || row['Amount'] || row['ပမာဏ'] ||'0');
 const a = isNaN(amount) ? 0 : amount;
 amountSum += a;

 const rawQty = row['QTY'] || row['အရေအတွက်'] || row['Qty'] || row['QTY'] || row['အရေအတွက်'] || row['Qty'];
 const qty = rawQty ? parseFloat(rawQty) : 1;
 const q = isNaN(qty) ? 1 : qty;
 qtySum += q;

 if (['Dia Sale','G Sale','PT Sale','Sale','အရောင်း'].includes(reason)) {
 sale.gram += g;
 sale.amount += a;
 sale.qty += q;
 } else if (['Dia RC','G RC','PT RC','RC','အဝယ်'].includes(reason)) {
 rc.gram += g;
 rc.amount += a;
 rc.qty += q;
 } else if (['Dia RP','G RP','PT RP','RP','ပြင်ဆင်'].includes(reason)) {
 rp.gram += g;
 rp.amount += a;
 rp.qty += q;
 }
 });

 return { totalGram: gramSum, totalAmount: amountSum, totalQty: qtySum, saleStats: sale, rcStats: rc, rpStats: rp };
 }, [data]);

 const showRp = (rpStats.amount || 0) !== 0 || (rpStats.qty || 0) !== 0 || (rpStats.gram || 0) !== 0;

 const cards = [
 {
 title: 'Total Amount',
 value: totalAmount.toLocaleString(),
 valueClass: 'text-[#1677ff]',
 rows: [
 { label: 'Sale', value: saleStats.amount.toLocaleString(), labelClass: 'text-emerald-600' },
 { label: 'RC', value: rcStats.amount.toLocaleString(), labelClass: 'text-red-500' },
 ...(showRp
 ? [{ label: 'RP', value: rpStats.amount.toLocaleString(), labelClass: 'text-orange-500' }]
 : []),
 {
 label: 'Net',
 value: (saleStats.amount - rcStats.amount).toLocaleString(),
 labelClass: 'text-[#1677ff]',
 strong: true,
 },
 ],
 },
 {
 title: 'Total Qty',
 value: totalQty.toLocaleString(),
 valueClass: 'text-orange-500',
 rows: [
 { label: 'Sale', value: saleStats.qty.toLocaleString(), labelClass: 'text-emerald-600' },
 { label: 'RC', value: rcStats.qty.toLocaleString(), labelClass: 'text-red-500' },
 ...(showRp
 ? [{ label: 'RP', value: rpStats.qty.toLocaleString(), labelClass: 'text-orange-500' }]
 : []),
 {
 label: 'Net',
 value: (saleStats.qty - rcStats.qty).toLocaleString(),
 labelClass: 'text-[#1677ff]',
 strong: true,
 },
 ],
 },
 {
 title: 'Total Gram',
 value: totalGram.toFixed(2),
 valueClass: 'text-emerald-600',
 rows: [
 { label: 'Sale', value: `${saleStats.gram.toFixed(2)}g`, labelClass: 'text-emerald-600' },
 { label: 'RC', value: `${rcStats.gram.toFixed(2)}g`, labelClass: 'text-red-500' },
 ...(showRp
 ? [{ label: 'RP', value: `${rpStats.gram.toFixed(2)}g`, labelClass: 'text-orange-500' }]
 : []),
 {
 label: 'Net',
 value: `${(saleStats.gram - rcStats.gram).toFixed(2)}g`,
 labelClass: 'text-[#1677ff]',
 strong: true,
 },
 ],
 },
 ];

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="grid grid-cols-1 gap-2.5 px-0.5 md:grid-cols-3"
 >
 {cards.map((card) => (
 <div
 key={card.title}
 className="flex flex-col justify-between rounded-xl border border-[#e8e8e8] bg-white p-3.5"
 >
 <div>
 <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
 {card.title}
 </p>
 <h3 className={`text-[22px] font-bold leading-none tracking-tight ${card.valueClass}`}>
 {card.value}
 </h3>
 <div className="mt-2.5 space-y-1 border-t border-[#f0f0f0] pt-2">
 {card.rows.map((row) => (
 <div
 key={row.label}
 className={`flex justify-between text-[11px] ${
 row.strong
 ? 'mt-0.5 border-t border-[#f5f5f5] pt-1 font-semibold'
 : 'font-medium'
 }`}
 >
 <span className={row.labelClass}>{row.label}</span>
 <span className="tabular-nums text-[#262626]">{row.value}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 ))}
 </motion.div>
 );
}

export default memo(SummaryCards);
