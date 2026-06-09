export interface BookingDateTimeParts {
  date: string;
  time: string;
}

export function splitDateTimeLocal(value: string): BookingDateTimeParts {
  const [datePart = '', timePart = '00:00'] = value.split('T');
  
  // Parse the date and time to handle timezone correctly
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  if (![year, month, day, hours, minutes].every((item) => Number.isFinite(item))) {
    return {
      date: datePart,
      time: timePart.length === 5 ? `${timePart}:00` : timePart,
    };
  }
  
  // Create date in local timezone to avoid timezone shifting
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  const localYear = localDate.getFullYear();
  const localMonth = String(localDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(localDate.getDate()).padStart(2, '0');
  const localHours = String(localDate.getHours()).padStart(2, '0');
  const localMinutes = String(localDate.getMinutes()).padStart(2, '0');
  
  return {
    date: `${localYear}-${localMonth}-${localDay}`,
    time: `${localHours}:${localMinutes}:00`,
  };
}
