'use client';

import { useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Building2, Car, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export interface ReportUsageItem {
  id: number;
  name: string;
  completedTripCount: number;
  totalDistanceKm: number;
}

interface ReportChartsProps {
  vehicleUsage: ReportUsageItem[];
  driverUsage: ReportUsageItem[];
  departmentUsage: ReportUsageItem[];
  fromDate: string;
  toDate: string;
  tripTypes: {
    id: number;
    name: string;
  }[];
  tripTypeId: number | null;
}

type ReportTab = 'vehicles' | 'drivers' | 'departments';
type RankingMode = 'trips' | 'distance';

function createChartOptions(rankingMode: RankingMode, labelColor: string): ChartOptions<'bar'> {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => rankingMode === 'trips'
            ? `${context.parsed.x} เที่ยว`
            : `${context.parsed.x} กม.`,
        },
      },
      datalabels: {
        anchor: 'center',
        align: 'center',
        color: labelColor,
        font: {
          size: 12,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: rankingMode === 'trips' ? 0 : undefined,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  };
}

function createChartData(items: ReportUsageItem[], label: string, color: string, rankingMode: RankingMode, useFirstName = false): ChartData<'bar'> {
  return {
    labels: items.map((item) => useFirstName ? item.name.trim().replace(/^(?:นางสาว|น\.ส\.|นส\.?|นาย|นาง)\s*/, '').split(/\s+/)[0] : item.name),
    datasets: [
      {
        label,
        data: items.map((item) => rankingMode === 'trips' ? item.completedTripCount : item.totalDistanceKm),
        backgroundColor: color,
        borderRadius: 6,
        borderSkipped: false,
        minBarLength: 110,
        datalabels: {
          formatter: (_value, context) => {
            const item = items[context.dataIndex];
            const trips = `${item?.completedTripCount ?? 0} เที่ยว`;
            const distance = `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(item?.totalDistanceKm ?? 0)} กม.`;
            return rankingMode === 'trips' ? trips : distance;
          },
        },
      },
    ],
  };
}

export default function ReportCharts({ vehicleUsage, driverUsage, departmentUsage, fromDate, toDate, tripTypes, tripTypeId }: ReportChartsProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('vehicles');
  const [rankingMode, setRankingMode] = useState<RankingMode>('trips');
  const isVehicleTab = activeTab === 'vehicles';
  const isDriverTab = activeTab === 'drivers';
  const activeUsage = [...(isVehicleTab ? vehicleUsage : isDriverTab ? driverUsage : departmentUsage)].sort((left, right) => (
    rankingMode === 'trips'
      ? right.completedTripCount - left.completedTripCount
      : right.totalDistanceKm - left.totalDistanceKm
  ));
  const chartData = createChartData(
    activeUsage,
    isVehicleTab ? 'จำนวนเที่ยวของยานพาหนะ' : isDriverTab ? 'จำนวนเที่ยวของพนักงานขับรถ' : 'จำนวนเที่ยวของกลุ่มงาน',
    isVehicleTab ? '#42f5da' : isDriverTab ? '#42e0f5' : '#fc9a95',
    rankingMode,
    isDriverTab
  );
  const chartHeight = Math.max(340, activeUsage.length * 46);
  const chartOptions = createChartOptions(rankingMode, '#1e293b');

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-100/80 bg-white/90 shadow-sm">
      <div className="border-b border-emerald-100/80 px-4 pt-4 md:px-6 md:pt-5">
        <form className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-end" method="get">
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
            ตั้งแต่วันที่
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
            ถึงวันที่
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
            ประเภท
            <select
              name="trip_type_id"
              defaultValue={tripTypeId ?? ''}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">ทั้งหมด</option>
              {tripTypes.map((tripType) => (
                <option key={tripType.id} value={tripType.id}>
                  {tripType.name === 'ภายในจังหวัด' ? 'ในจังหวัด' : tripType.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            ตกลง
          </button>
        </form>

        <div className="mt-5 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              isVehicleTab ? 'bg-[#42f5da] text-slate-800' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-800'
            )}
          >
            <Car className="h-4 w-4" />
            ยานพาหนะ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              isDriverTab ? 'bg-[#42e0f5] text-slate-800' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
            )}
          >
            <UserRound className="h-4 w-4" />
            พนักงานขับรถ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              activeTab === 'departments' ? 'bg-[#fc9a95] text-slate-800' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-700'
            )}
          >
            <Building2 className="h-4 w-4" />
            กลุ่มงาน
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-5 flex items-center justify-end gap-1">
          <span className="mr-2 text-xs font-semibold text-slate-400">เรียงตาม</span>
          <button
            type="button"
            onClick={() => setRankingMode('trips')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              rankingMode === 'trips' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            )}
          >
            เที่ยว
          </button>
          <button
            type="button"
            onClick={() => setRankingMode('distance')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              rankingMode === 'distance' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            )}
          >
            กม.
          </button>
        </div>
        {activeUsage.length > 0 ? (
          <div style={{ height: chartHeight }}>
            <Bar options={chartOptions} data={chartData} />
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-lg bg-slate-50 text-sm font-medium text-slate-400">
            ยังไม่มีข้อมูลการเดินทาง
          </div>
        )}
      </div>
    </section>
  );
}
