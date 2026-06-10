import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { fetchDistrict, fetchProvince, fetchProvinces, VietnamDistrict, VietnamProvince, VietnamWard } from "./vietnamAddressApi";

export type AddressValue = {
  street: string;
  provinceCode?: number;
  provinceName?: string;
  districtCode?: number;
  districtName?: string;
  wardCode?: number;
  wardName?: string;
  fullAddress: string;
};

type Props = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  label?: string;
  required?: boolean;
};

function joinAddress(next: Partial<AddressValue>) {
  return [next.street, next.wardName, next.districtName, next.provinceName]
    .filter(Boolean)
    .join(", ");
}

export function createAddressFromText(address = ""): AddressValue {
  return { street: address, fullAddress: address };
}

export function VietnamAddressPicker({ value, onChange, label = "Địa chỉ", required }: Props) {
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [districts, setDistricts] = useState<VietnamDistrict[]>([]);
  const [wards, setWards] = useState<VietnamWard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchProvinces()
      .then(data => {
        if (!ignore) setProvinces(data);
      })
      .catch(() => {
        if (!ignore) setError("Không tải được danh sách tỉnh thành.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!value.provinceCode) {
      setDistricts([]);
      return;
    }
    let ignore = false;
    fetchProvince(value.provinceCode)
      .then(data => {
        if (!ignore) setDistricts(data.districts || []);
      })
      .catch(() => {
        if (!ignore) setError("Không tải được quận/huyện.");
      });
    return () => {
      ignore = true;
    };
  }, [value.provinceCode]);

  useEffect(() => {
    if (!value.districtCode) {
      setWards([]);
      return;
    }
    let ignore = false;
    fetchDistrict(value.districtCode)
      .then(data => {
        if (!ignore) setWards(data.wards || []);
      })
      .catch(() => {
        if (!ignore) setError("Không tải được phường/xã.");
      });
    return () => {
      ignore = true;
    };
  }, [value.districtCode]);

  const fullAddress = useMemo(() => joinAddress(value), [value]);
  const patch = (patchValue: Partial<AddressValue>) => {
    const next = { ...value, ...patchValue };
    onChange({ ...next, fullAddress: joinAddress(next) });
  };

  return (
    <div className="space-y-3">
      <label style={{ fontSize:"12.5px", color:"#374151", fontWeight:600 }}>
        {label}{required ? " *" : ""}
      </label>
      <input
        value={value.street}
        onChange={event => patch({ street: event.target.value })}
        placeholder="Số nhà, tên đường..."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761]"
        style={{ fontSize:"13.5px" }}
      />
      <div className="grid grid-cols-3 gap-2">
        <SelectBox
          value={value.provinceCode || ""}
          disabled={loading}
          placeholder={loading ? "Đang tải..." : "Tỉnh/Thành"}
          options={provinces.map(item => ({ value: item.code, label: item.name }))}
          onChange={code => {
            const province = provinces.find(item => item.code === code);
            patch({
              provinceCode: code,
              provinceName: province?.name,
              districtCode: undefined,
              districtName: undefined,
              wardCode: undefined,
              wardName: undefined,
            });
            setWards([]);
          }}
        />
        <SelectBox
          value={value.districtCode || ""}
          disabled={!value.provinceCode}
          placeholder="Quận/Huyện"
          options={districts.map(item => ({ value: item.code, label: item.name }))}
          onChange={code => {
            const district = districts.find(item => item.code === code);
            patch({ districtCode: code, districtName: district?.name, wardCode: undefined, wardName: undefined });
          }}
        />
        <SelectBox
          value={value.wardCode || ""}
          disabled={!value.districtCode}
          placeholder="Phường/Xã"
          options={wards.map(item => ({ value: item.code, label: item.name }))}
          onChange={code => {
            const ward = wards.find(item => item.code === code);
            patch({ wardCode: code, wardName: ward?.name });
          }}
        />
      </div>
      {loading && <p className="flex items-center gap-1.5 text-gray-500" style={{ fontSize:"12px" }}><Loader2 size={13} className="animate-spin"/> Đang kết nối API tỉnh thành...</p>}
      {error && <p className="text-red-600" style={{ fontSize:"12px" }}>{error}</p>}
      {fullAddress && <p className="text-gray-500" style={{ fontSize:"12px" }}>Địa chỉ đầy đủ: <strong className="text-gray-800">{fullAddress}</strong></p>}
    </div>
  );
}

function SelectBox({
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  value: number | "";
  placeholder: string;
  options: Array<{ value: number; label: string }>;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full px-3 py-2.5 pr-8 border border-gray-200 rounded-xl outline-none appearance-none bg-white disabled:opacity-60 focus:border-[#0F4761]"
        style={{ fontSize:"13px" }}
      >
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"/>
    </div>
  );
}
