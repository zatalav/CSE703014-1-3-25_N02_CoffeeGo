import { useState } from "react";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";

const roles: Array<{ id: string; name: string; desc: string; color: string; readonly: boolean }> = [];

const modules: Array<{ id: string; label: string }> = [];

const defaultPerms: Record<string, Record<string, Record<string, boolean>>> = {
};

export function Permissions() {
  const [selectedRole, setSelectedRole] = useState("");
  const [perms, setPerms] = useState(defaultPerms);

  const role = roles.find(r => r.id === selectedRole);
  const rolePerms = perms[selectedRole] ?? {};

  const toggle = (module: string, action: string) => {
    if (!role || role.readonly) return;
    setPerms(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole][module],
          [action]: !prev[selectedRole][module][action],
        }
      }
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Phân quyền theo vai trò</h1>
        <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Cấu hình quyền truy cập cho từng vai trò trong hệ thống</p>
      </div>

      <div className="flex gap-5">
        {/* Role list */}
        <div className="w-56 shrink-0 space-y-2">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`w-full p-3 rounded-xl border text-left transition-all ${selectedRole === r.id ? "border-[#0F4761] bg-[#0F4761]/5 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>{r.name}</span>
                {r.readonly && <Lock size={12} className="text-gray-400" />}
              </div>
              <p style={{fontSize: '11.5px', color: '#9CA3AF'}}>{r.desc}</p>
            </button>
          ))}
        </div>

        {/* Permissions matrix */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-[#0F4761]" />
              <div>
                <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827'}}>{role?.name ?? "Chưa có vai trò"}</h3>
                <p style={{fontSize: '12px', color: '#9CA3AF'}}>{role?.desc ?? "Dữ liệu vai trò sẽ được tải từ backend."}</p>
              </div>
              {role?.readonly && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full flex items-center gap-1" style={{fontSize: '11.5px'}}>
                  <Lock size={11} /> Chỉ đọc
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Module</th>
                  {["Xem", "Thêm", "Sửa", "Xóa"].map(a => (
                    <th key={a} className="px-4 py-3 text-center" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modules.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5" style={{fontSize: '13.5px', color: '#374151', fontWeight: 500}}>{m.label}</td>
                    {(["view", "add", "edit", "delete"] as const).map(action => (
                      <td key={action} className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggle(m.id, action)}
                          disabled={role?.readonly}
                          className={`w-10 h-6 rounded-full transition-all relative ${rolePerms[m.id]?.[action] ? "bg-[#0F4761]" : "bg-gray-200"} ${role?.readonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${rolePerms[m.id]?.[action] ? "left-4.5" : "left-0.5"}`} style={{left: rolePerms[m.id]?.[action] ? '18px' : '2px'}} />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!role?.readonly && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" style={{fontSize: '13.5px'}}>
                Đặt lại mặc định
              </button>
              <button
                onClick={() => toast.success("Đã lưu cấu hình quyền!")}
                className="px-5 py-2 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]"
                style={{fontSize: '13.5px'}}
              >
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
