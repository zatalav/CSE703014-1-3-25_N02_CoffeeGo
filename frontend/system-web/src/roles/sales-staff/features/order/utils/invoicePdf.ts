import { jsPDF } from "jspdf";
import { Order } from "../types";
import { formatVnd } from "../../../shared/lib/format";

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const removeVietnameseMarks = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const text = (value: unknown) => removeVietnameseMarks(String(value ?? ""));

function addWrappedText(doc: jsPDF, value: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(text(value), maxWidth);
  doc.text(lines, x, y);
  return y + Math.max(lines.length, 1) * lineHeight;
}

export function printOrderInvoice(order: Order, title = "Hoa don CoffeeGo") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const totalDue = Math.max(0, order.total - order.discount);
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(123, 74, 45);
  doc.text("CoffeeGo", margin, y);

  doc.setFontSize(12);
  doc.setTextColor(44, 26, 14);
  doc.text(text(title), pageWidth - margin, y, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 83, 68);
  doc.text(`Hoa don #${text(order.orderNumber)}`, margin, y);
  doc.text(new Date().toLocaleString("vi-VN"), pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setDrawColor(123, 74, 45);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;
  doc.setTextColor(44, 26, 14);
  doc.setFontSize(10);
  const leftMeta = [
    `Khach hang: ${order.customerName || "Khach vang lai"}`,
    `Nhan vien: ${order.staffName || "-"}`,
    `Loai don: ${order.orderType === "delivery" ? "Online giao hang" : "Tai quan"}`,
  ];
  const rightMeta = [
    `Thanh toan: ${order.paymentMethod || "-"}`,
    `Trang thai: ${order.status}`,
    `Ma don: #${order.orderNumber}`,
  ];
  leftMeta.forEach((line, index) => doc.text(text(line), margin, y + index * 6));
  rightMeta.forEach((line, index) => doc.text(text(line), pageWidth / 2 + 6, y + index * 6));
  y += 22;

  if (order.note) {
    y = addWrappedText(doc, `Ghi chu: ${order.note}`, margin, y, contentWidth);
    y += 2;
  }

  doc.setFillColor(245, 237, 227);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(74, 44, 23);
  doc.text("San pham", margin + 2, y + 5.5);
  doc.text("SL", pageWidth - 72, y + 5.5, { align: "right" });
  doc.text("Don gia", pageWidth - 44, y + 5.5, { align: "right" });
  doc.text("Thanh tien", pageWidth - margin - 2, y + 5.5, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(44, 26, 14);
  order.items.forEach((item) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    const itemName = `${item.name}${item.size ? ` - Size ${item.size}` : ""}${item.note ? ` - ${item.note}` : ""}`;
    const startY = y;
    y = addWrappedText(doc, itemName, margin + 2, y, 86, 5);
    if (item.toppings.length) {
      doc.setTextColor(107, 83, 68);
      y = addWrappedText(doc, `Topping: ${item.toppings.join(", ")}`, margin + 2, y, 86, 5);
      doc.setTextColor(44, 26, 14);
    }
    doc.text(String(item.qty), pageWidth - 72, startY, { align: "right" });
    doc.text(formatVnd(item.price), pageWidth - 44, startY, { align: "right" });
    doc.text(formatVnd(item.price * item.qty), pageWidth - margin - 2, startY, { align: "right" });
    y += 2;
    doc.setDrawColor(245, 237, 227);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  });

  y = Math.max(y + 4, 210);
  const totalX = pageWidth - margin - 72;
  const valueX = pageWidth - margin - 2;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(44, 26, 14);
  doc.text("Tam tinh", totalX, y);
  doc.text(formatVnd(order.total), valueX, y, { align: "right" });
  y += 7;
  doc.text("Giam gia", totalX, y);
  doc.text(`-${formatVnd(order.discount)}`, valueX, y, { align: "right" });
  y += 5;
  doc.setDrawColor(123, 74, 45);
  doc.line(totalX, y, valueX, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(196, 129, 58);
  doc.setFontSize(13);
  doc.text("Thanh toan", totalX, y);
  doc.text(formatVnd(totalDue), valueX, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 83, 68);
  doc.text("Cam on quy khach da su dung dich vu CoffeeGo.", pageWidth / 2, 286, { align: "center" });

  const fileName = `${sanitizeFileName(title || "Hoa-don")}-${sanitizeFileName(order.orderNumber || order.id)}.pdf`;
  doc.save(fileName);
}
