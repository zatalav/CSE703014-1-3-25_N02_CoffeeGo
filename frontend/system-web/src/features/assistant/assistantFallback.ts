export type AssistantFallbackResult = {
  answer: string;
  suggestions: string[];
};

const defaultSuggestions = [
  "Tom tat van hanh hom nay",
  "Co canh bao nao can xu ly khong?",
  "Nen uu tien viec gi truoc?",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roleKey(roleName?: string | null) {
  const normalized = normalizeText(roleName || "").replace(/ /g, "_");
  const text = normalized.replace(/_/g, " ");
  if (normalized === "admin" || text.includes("quan tri")) return "admin";
  if (normalized === "branch_manager" || text.includes("quan ly chi nhanh") || text.includes("quan ly ban hang")) {
    return "branch_manager";
  }
  if (normalized === "warehouse_manager" || text.includes("quan ly kho")) return "warehouse_manager";
  if (normalized === "warehouse_staff" || text.includes("nhan vien kho")) return "warehouse_staff";
  if (normalized === "delivery_staff" || text.includes("nhan vien giao hang") || text.includes("shipper")) {
    return "delivery_staff";
  }
  return "sales_staff";
}

function roleScope(key: string) {
  switch (key) {
    case "admin":
      return "toan he thong";
    case "branch_manager":
      return "chi nhanh cua ban";
    case "warehouse_manager":
    case "warehouse_staff":
      return "kho va nguyen lieu";
    case "delivery_staff":
      return "don giao hang";
    default:
      return "POS va don hang tai quay";
  }
}

function suggestionsForRole(key: string) {
  switch (key) {
    case "branch_manager":
      return ["Chi nhanh dang co bao nhieu don cho?", "Don nao can uu tien truoc?", "Nguyen lieu nao sap het?"];
    case "warehouse_manager":
    case "warehouse_staff":
      return ["Nguyen lieu nao sap het?", "Can nhap kho gi truoc?", "Tom tat rui ro ton kho"];
    case "delivery_staff":
      return ["Co don nao san sang giao?", "Don giao nao can uu tien?", "Luu y khi lien he khach"];
    case "sales_staff":
      return ["Don nao can xu ly truoc?", "Cach xu ly don khach muon huy", "Tu van quy trinh ban hang"];
    default:
      return defaultSuggestions;
  }
}

export function buildAssistantFallback(message: string, roleName?: string | null): AssistantFallbackResult {
  const normalized = normalizeText(message);
  const key = roleKey(roleName);
  const scope = roleScope(key);
  const suggestions = suggestionsForRole(key);
  const prefix = `Minh chua ket noi duoc AI service, nen dang tra loi nhanh theo quy trinh trong pham vi ${scope}.`;

  if (normalized.includes("don") || normalized.includes("order") || normalized.includes("hang cho")) {
    return {
      answer: `${prefix}\n\nHay uu tien don tao som nhat dang pending/confirmed, kiem tra thanh toan va ghi chu cua khach, sau do cap nhat dung luong pending -> confirmed -> preparing -> ready -> completed.`,
      suggestions,
    };
  }

  if (normalized.includes("kho") || normalized.includes("ton") || normalized.includes("nguyen lieu")) {
    return {
      answer: `${prefix}\n\nHay xu ly cac nguyen lieu duoi muc toi thieu truoc, uu tien mat hang co muc thieu lon nhat va doi chieu phieu nhap/xuat gan nhat truoc khi tao yeu cau bo sung.`,
      suggestions,
    };
  }

  if (normalized.includes("giao") || normalized.includes("ship") || normalized.includes("van chuyen")) {
    return {
      answer: `${prefix}\n\nHay nhan don ready theo thu tu tao som nhat, goi khach xac nhan dia chi/so dien thoai, cap nhat delivering khi bat dau giao va completed khi giao xong.`,
      suggestions,
    };
  }

  if (normalized.includes("doanh thu") || normalized.includes("bao cao") || normalized.includes("report")) {
    return {
      answer: `${prefix}\n\nHay doi chieu so don, doanh thu da thanh toan, don huy va san pham ban chay trong cung khoang thoi gian truoc khi ket luan xu huong.`,
      suggestions,
    };
  }

  return {
    answer: `${prefix}\n\nBan co the hoi ve don can uu tien, ton kho thap, giao hang, doanh thu hoac quy trinh xu ly theo vai tro hien tai.`,
    suggestions,
  };
}
