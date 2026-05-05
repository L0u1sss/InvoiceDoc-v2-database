import React from "react";
import { listSalesPersons } from "../api/sales_persons.api.js";
import ListPickerModal from "./ListPickerModal.jsx";

// กำหนดว่าตารางหน้าต่างเด้ง (LoV) จะมีแสดงคอลัมน์อะไรบ้าง
const COLUMNS = [
  { key: "code", label: "Sales Person Code" },
  { key: "name", label: "Name" }
];

export default function SalesPersonPickerModal({ isOpen, onClose, onSelect, initialSearch = "" }) {
  // fetchData เป็นฟังก์ชันดึงข้อมูล จะปาเข้าไปใน ListPickerModal ตัวแม่
  const fetchData = React.useCallback((params) => listSalesPersons(params), []);

  // เมื่อผู้ใช้กดคลิกเลือกแถวใดแถวหนึ่ง
  const handleSelect = React.useCallback(
    (row) => {
      onSelect(row.code, `${row.code} - ${row.name}`);
    },
    [onSelect]
  );

  return (
    <ListPickerModal
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelect}
      initialSearch={initialSearch}
      title="Select Sales Person"
      searchPlaceholder="ค้นหารหัสพนักงาน, ชื่อ..."
      fetchData={fetchData}
      columns={COLUMNS}
      itemName="sales_person"
      emptySearch="ไม่พบข้อมูลพนักงานขาย"
      emptyDefault="ยังไม่มีข้อมูลพนักงานขาย"
      getSelectLabel={(row) => `${row.code} - ${row.name}`}
    />
  );
}
