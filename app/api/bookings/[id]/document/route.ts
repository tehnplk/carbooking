export const dynamic = 'force-dynamic';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import {
  getBookingPrintData,
  renderBookingPrintError,
} from '@/lib/booking-print';

type BookingDocData = NonNullable<Awaited<ReturnType<typeof getBookingPrintData>>>;

function safeValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function hasMultipleVehicleAssignments(booking: BookingDocData) {
  return Number(booking.vehicle_assignment_count) > 1 && Boolean(booking.vehicle_assignments);
}

function docLicensePlateValue(booking: BookingDocData) {
  return hasMultipleVehicleAssignments(booking)
    ? safeValue(booking.vehicle_assignments)
    : safeValue(booking.license_plate);
}

function docDriverValue(booking: BookingDocData) {
  return hasMultipleVehicleAssignments(booking) ? '' : safeValue(booking.driver_name);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DOC_TEXT_RUN_PROPERTIES =
  '<w:rPr><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New" w:cs="TH Sarabun New"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr>';

function textRunsXml(text: string) {
  const lines = text.split('\n');
  return lines
    .map((line, index) => {
      const breakXml = index === 0 ? '' : `<w:r>${DOC_TEXT_RUN_PROPERTIES}<w:br/></w:r>`;
      return `${breakXml}<w:r>${DOC_TEXT_RUN_PROPERTIES}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
    })
    .join('');
}

function parseVehicleAssignments(booking: BookingDocData) {
  const rawAssignments = safeValue(booking.vehicle_assignments);

  if (!rawAssignments) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawAssignments) as Array<{
      license_plate?: string | null;
      driver_name?: string | null;
    }>;

    if (Array.isArray(parsed)) {
      return parsed
        .map((assignment) => ({
          licensePlate: safeValue(assignment.license_plate).trim(),
          driverName: safeValue(assignment.driver_name).trim(),
        }))
        .filter((assignment) => assignment.licensePlate || assignment.driverName);
    }
  } catch {
    // Older generated values used comma-separated plate-driver text.
  }

  return rawAssignments
    .split(',')
    .map((item) => {
      const [licensePlate, ...driverParts] = item.trim().split('-');
      return {
        licensePlate: licensePlate.trim(),
        driverName: driverParts.join('-').trim(),
      };
    })
    .filter((assignment) => assignment.licensePlate || assignment.driverName);
}

function buildVehicleAssignmentLines(booking: BookingDocData) {
  const assignments = parseVehicleAssignments(booking);

  return assignments
    .map((assignment, index) => {
      return `${index + 1}. หมายเลขทะเบียน ${assignment.licensePlate || '-'} โดยมี ${assignment.driverName || '-'} เป็นผู้ขับ`;
    })
    .join('\n');
}

function findRunStartBefore(xml: string, index: number) {
  const runStartPattern = /<w:r(?=[\s>])/g;
  let match: RegExpExecArray | null;
  let lastRunStart = -1;

  while ((match = runStartPattern.exec(xml)) !== null) {
    if (match.index > index) break;
    lastRunStart = match.index;
  }

  return lastRunStart;
}

function findRunEndAfter(xml: string, index: number) {
  const runEndIndex = xml.indexOf('</w:r>', index);
  return runEndIndex < 0 ? -1 : runEndIndex + '</w:r>'.length;
}

function replaceXmlSegmentByText(xml: string, startText: string, endText: string, replacementText: string) {
  let updatedXml = xml;
  let searchFrom = 0;

  while (true) {
    const startTextIndex = updatedXml.indexOf(startText, searchFrom);
    if (startTextIndex < 0) break;

    const startRunIndex = findRunStartBefore(updatedXml, startTextIndex);
    const endTextIndex = updatedXml.indexOf(endText, startTextIndex);
    if (startRunIndex < 0 || endTextIndex < 0) break;

    const endRunIndex = findRunEndAfter(updatedXml, endTextIndex);
    if (endRunIndex < 0 || endRunIndex <= startRunIndex) break;

    updatedXml = `${updatedXml.slice(0, startRunIndex)}${textRunsXml(replacementText)}${updatedXml.slice(endRunIndex)}`;
    searchFrom = startRunIndex + replacementText.length;
  }

  return updatedXml;
}

function patchVehicleAssignmentSection(xml: string, booking: BookingDocData) {
  if (!hasMultipleVehicleAssignments(booking)) return xml;

  const vehicleLines = buildVehicleAssignmentLines(booking);
  if (!vehicleLines) return xml;

  return replaceXmlSegmentByText(
    xml,
    'เห็นสมควรให้ใช้รถยนต์เบอร์',
    'ของทางราชการ เป็นพนักงานรถขับรถยนต์  และได้เติมน้ำมันเชื้อเพลิงให้พร้อม',
    `เห็นสมควรให้ใช้รถยนต์\n     ${vehicleLines.replace(/\n/g, '\n     ')}\n`
  );
}

function formatThaiDate(input: string | null | undefined) {
  if (!input) {
    return '';
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function buildInProvincePayload(booking: BookingDocData) {
  return {
    requester_name: safeValue(booking.requester_name),
    request_name: safeValue(booking.requester_name),
    requester_position: safeValue(booking.requester_position),
    ' requester_position': safeValue(booking.requester_position),
    position: safeValue(booking.requester_position),
    department_name: safeValue(booking.department_name),
    supervisor_name: safeValue(booking.supervisor_name),
    supervisor_position: safeValue(booking.supervisor_position),
    destination: safeValue(booking.destination),
    purpose: safeValue(booking.purpose),
    passengers: safeValue(booking.passengers),
    car_id: safeValue(booking.car_number),
    car_licence_plate: docLicensePlateValue(booking),
    car_type: safeValue(booking.car_type),
    current_date: formatCurrentThaiDate(),
    fuel_reimbursement: safeValue(booking.fuel_reimbursement),
    trip_type: safeValue(booking.trip_type_name),
    start_date: formatThaiDate(booking.start_date),
    end_date: formatThaiDate(booking.end_date),
    start_time: formatTime(booking.start_time),
    end_time: formatTime(booking.end_time),
    driver_name: docDriverValue(booking),
    driver_fullname: docDriverValue(booking),
    driver_type_name: safeValue(booking.driver_type_name),
    car_brand: safeValue(booking.brand),
    car_model: safeValue(booking.model),
    license_plate: docLicensePlateValue(booking),
    vehicle_assignments: safeValue(booking.vehicle_assignments),
  };
}

function buildOutProvincePayload(booking: BookingDocData) {
  return {
    requester_name: safeValue(booking.requester_name),
    requester_position: safeValue(booking.requester_position),
    supervisor_name: safeValue(booking.supervisor_name),
    supervisor_position: safeValue(booking.supervisor_position),
    destination: safeValue(booking.destination),
    purpose: safeValue(booking.purpose),
    passengers: safeValue(booking.passengers),
    car_brand: safeValue(booking.brand),
    car_type: safeValue(booking.car_type),
    car_licence_plate: docLicensePlateValue(booking),
    car_licence_palte: docLicensePlateValue(booking),
    fuel_reimbursement: safeValue(booking.fuel_reimbursement),
    fuel_reimbursement_name: safeValue(booking.fuel_reimbursement),
    current_date: formatCurrentThaiDate(),
    start_date: formatThaiDate(booking.start_date),
    end_date: formatThaiDate(booking.end_date),
    start_time: formatTime(booking.start_time),
    end_time: formatTime(booking.end_time),
    driver_fullname: docDriverValue(booking),
    vehicle_assignments: safeValue(booking.vehicle_assignments),
  };
}

function selectTemplateAndPayload(booking: BookingDocData) {
  if (booking.trip_type_id === 2) {
    return {
      templateFile: 'doc_out_prov.docx',
      payload: buildOutProvincePayload(booking),
    };
  }

  return {
    templateFile: 'doc_in_prov.docx',
    payload: buildInProvincePayload(booking),
  };
}

function formatCurrentThaiDate() {
  return new Intl.DateTimeFormat('th-TH-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function formatTime(input: string | null | undefined) {
  if (!input) {
    return '';
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(input)) {
    const [hours, minutes] = input.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getBookingPrintData(id);

    if (!booking) {
      return new NextResponse(
        renderBookingPrintError('Booking not found', 'ไม่พบข้อมูลใบขอใช้รถ'),
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    if (!booking.isAssigned) {
      return new NextResponse(
        renderBookingPrintError(
          'Booking not ready',
          'เอกสารสามารถพิมพ์ได้หลังจากจัดรถและพนักงานขับรถแล้วเท่านั้น'
        ),
        {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    const { templateFile, payload } = selectTemplateAndPayload(booking);
    const templatePath = path.join(process.cwd(), 'doc', templateFile);
    const templateBinary = await readFile(templatePath, 'binary');
    const zip = new PizZip(templateBinary);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.render(payload);

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const patchedZip = new PizZip(outputBuffer);
    const documentXml = patchedZip.file('word/document.xml')?.asText();
    if (documentXml) {
      patchedZip.file('word/document.xml', patchVehicleAssignmentSection(documentXml, booking));
    }
    const finalOutputBuffer = patchedZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return new NextResponse(new Uint8Array(finalOutputBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="booking-${booking.id}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error rendering booking document:', error);
    return new NextResponse(
      renderBookingPrintError('Render failed', 'ไม่สามารถสร้างเอกสารสำหรับพิมพ์ได้'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
