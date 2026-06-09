import {
  ensureMasterDataSchema,
  getCarTypes as getCarTypesFromMaster,
  isValidCarType,
} from '@/lib/master-data';

export interface CarTypeOption {
  id: number;
  name: string;
  is_active: boolean;
}

export async function ensureCarTypeSchema() {
  await ensureMasterDataSchema();
}

export async function getCarTypes() {
  return getCarTypesFromMaster() as Promise<CarTypeOption[]>;
}

export async function resolveCarTypeId(input: { car_type_id?: number | null; car_type?: string | null }) {
  await ensureCarTypeSchema();

  if (input.car_type_id && Number.isFinite(input.car_type_id) && await isValidCarType(input.car_type_id)) {
    return input.car_type_id;
  }

  if (input.car_type) {
    const activeRows = await getCarTypes();
    const matched = activeRows.find((item) => item.name === input.car_type!.trim());
    return matched?.id ?? null;
  }

  return null;
}
