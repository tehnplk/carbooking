'use client';

import CarFormModal from './CarFormModal';

interface EditCarModalProps {
  car: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    car_number?: string | null;
    seats?: number | null;
    car_type_id?: number | null;
    car_type?: string | null;
    is_active: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditCarModal({ car, isOpen, onClose }: EditCarModalProps) {
  return <CarFormModal car={car} isOpen={isOpen} onClose={onClose} />;
}
