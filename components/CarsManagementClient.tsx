'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, BusFront, Car, CarFront, CircleCheckBig, Plus, Search, Settings2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import CarActions from '@/components/CarActions';
import CarFormModal from '@/components/CarFormModal';
import { createPortal } from 'react-dom';

interface CarRow {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  car_number?: string | null;
  seats?: number | null;
  car_type_id?: number | null;
  car_type?: string | null;
  is_active: boolean;
}

const noopSubscribe = () => () => {};
const UNDEFINED_CAR_TYPE = 'ไม่ระบุประเภทรถ';

function getVehicleIcon(carType?: string | null) {
  const value = (carType ?? '').toLowerCase();

  if (value.includes('ตู้') || value.includes('van')) return BusFront;
  if (value.includes('กระบะ') || value.includes('pickup')) return Truck;
  if (value.includes('suv')) return CarFront;
  if (value.includes('บรรทุก')) return Truck;

  return Car;
}

export default function CarsManagementClient({ cars, canManage, isAuthenticated }: { cars: CarRow[]; canManage: boolean; isAuthenticated: boolean }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isMounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalCars = cars.length;
  const activeType = searchParams.get('type')?.trim() || 'all';

  const carsByType = useMemo(() => {
    const counter = new Map<string, number>();

    for (const car of cars) {
      const carType = car.car_type?.trim() || UNDEFINED_CAR_TYPE;
      counter.set(carType, (counter.get(carType) ?? 0) + 1);
    }

    return Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [cars]);

  const carTypeFilterOptions = useMemo(
    () => [
      { name: 'all', label: 'รถทั้งหมด', count: totalCars },
      ...carsByType.map((item) => ({ name: item.name, label: item.name, count: item.count })),
    ],
    [carsByType, totalCars]
  );

  const filteredCars = useMemo(() => {
    let result = cars;
    
    // Filter by type
    if (activeType !== 'all') {
      result = result.filter((car) => (car.car_type?.trim() || UNDEFINED_CAR_TYPE) === activeType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((car) => 
        car.license_plate?.toLowerCase().includes(query) ||
        car.brand?.toLowerCase().includes(query) ||
        car.model?.toLowerCase().includes(query) ||
        car.car_number?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [activeType, cars, searchQuery]);

  const setTypeFilter = (nextType: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextType === 'all') {
      params.delete('type');
    } else {
      params.set('type', nextType);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const createButtonDesktop = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-2 h-4 w-4" />
      เพิ่มรถใหม่
    </button>
  ) : null;

  const createButtonMobile = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-1.5 h-4 w-4" />
      เพิ่มรถ
    </button>
  ) : null;

  const headerActionContainer = isMounted ? document.getElementById('header-extra-actions') : null;
  const headerActionMobileContainer = isMounted ? document.getElementById('header-extra-actions-mobile') : null;
  const desktopPortal = headerActionContainer ? createPortal(createButtonDesktop, headerActionContainer) : null;
  const mobilePortal = headerActionMobileContainer ? createPortal(createButtonMobile, headerActionMobileContainer) : null;

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-4 duration-300">
      {desktopPortal}
      {mobilePortal}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 bg-white p-4">
          <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
            <div className="relative min-w-0 flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาด้วยทะเบียนหรือรุ่น..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="h-10 w-10 rounded-md border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <label
              className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500"
              htmlFor="car-type-mobile"
            >
              ประเภทรถ
            </label>
            <select
              id="car-type-mobile"
              aria-label="เลือกประเภทรถ"
              value={activeType}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              {carTypeFilterOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </div>

          <div
            role="tablist"
            aria-label="ประเภทของรถ"
            className="hidden flex-wrap items-center gap-2 md:flex"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeType === 'all'}
              onClick={() => setTypeFilter('all')}
              className={cn(
                'inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold transition-all',
                activeType === 'all'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-800'
              )}
            >
              รถทั้งหมด {totalCars} คัน
            </button>
            {carsByType.map((item) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={activeType === item.name}
                onClick={() => setTypeFilter(item.name)}
                className={cn(
                  'inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold transition-all',
                  activeType === item.name
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-800'
                )}
              >
                {item.name} {item.count} คัน
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ลำดับ</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">หมายเลขรถ</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ข้อมูลรถ</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ประเภทรถ</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <CircleCheckBig className="w-3.5 h-3.5" />สถานะ
                  </span>
                </th>
                {isAuthenticated && <th className="px-8 py-3 text-right text-[11px] font-semibold uppercase text-slate-500">ดำเนินการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCars.map((car, index) => {
                const VehicleIcon = getVehicleIcon(car.car_type);

                return (
                  <tr key={car.id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-8 py-3">
                      {car.car_number ? (
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">
                          {car.car_number}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold uppercase text-slate-300">ไม่ระบุ</span>
                      )}
                    </td>
                    <td className="px-8 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                          <VehicleIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-emerald-800">{car.license_plate}</div>
                          <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {car.brand} {car.model}
                            {car.seats ? <span className="text-slate-400"> - {car.seats} ที่นั่ง</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-3">
                      <span className={cn('inline-flex items-center rounded-md px-3 py-1 text-[10px] font-semibold uppercase', 'bg-emerald-50 text-emerald-700')}>
                        {car.car_type || UNDEFINED_CAR_TYPE}
                      </span>
                    </td>
                    <td className="px-8 py-3">
                      <span className={cn('inline-flex items-center rounded-md px-3 py-1 text-[10px] font-semibold', car.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full mr-2', car.is_active ? 'bg-emerald-500' : 'bg-rose-500')} />
                        {car.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    {isAuthenticated && (
                      <td className="px-8 py-3 text-right">
                        <CarActions car={car} canManage={canManage} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCars.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="rounded-md bg-slate-50 p-6">
                <AlertCircle className="w-12 h-12 text-emerald-300" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-emerald-800">ไม่พบรถยนต์</h3>
                <p className="text-emerald-700/70 font-medium max-w-xs mx-auto">ไม่พบรถในประเภทที่เลือก</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {canManage && <CarFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}
