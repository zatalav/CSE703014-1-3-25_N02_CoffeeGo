import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { loadComboItems, type Product } from "../customerMenu";
import { productImg } from "../data";
import { formatVND, useApp } from "../store";
import { ImageWithFallback } from "./figma/ImageWithFallback";

function normalizeProductText(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isFoodProduct(product: Product) {
  const type = normalizeProductText(product.productType);
  if (["cake", "bakery", "pastry", "snack", "food"].includes(type)) return true;

  const text = normalizeProductText([
    product.name,
    product.description,
    product.category,
  ].filter(Boolean).join(" "));

  return ["banh", "cake", "bakery", "pastry", "croissant", "snack", "food"]
    .some((keyword) => text.includes(keyword));
}

export function ProductModal({
  product,
  menuProducts = [],
  onClose,
}: {
  product: Product;
  menuProducts?: Product[];
  onClose: () => void;
}) {
  const { addToCart } = useApp();
  const isCombo = product.kind === "combo";
  const isFood = isFoodProduct(product);
  const hasDrinkCustomizations = !isCombo && !isFood;
  const [size, setSize] = useState(product.prices[0] ?? { size: isCombo ? "Combo" : "Tiêu chuẩn", price: 0 });
  const [variant, setVariant] = useState(product.variants?.[0] || "");
  const [ice, setIce] = useState("Bình thường");
  const [sugar, setSugar] = useState("Vừa");
  const [milk, setMilk] = useState("Sữa đặc");
  const [selectedToppings, setSelectedToppings] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [comboItems, setComboItems] = useState(product.comboItems || []);
  const [comboItemsLoading, setComboItemsLoading] = useState(false);
  const availableToppings = hasDrinkCustomizations ? product.toppings || [] : [];
  const configuredSizes = hasDrinkCustomizations ? product.prices.filter((item) => item.sizeId != null) : [];
  const hasVariants = hasDrinkCustomizations && Boolean(product.variants?.length);
  const hasConfiguredSizes = configuredSizes.length > 0;
  const milkOptions = [
    { label: "Không", price: 0 },
    { label: "Sữa đặc", price: 0 },
    { label: "Sữa tươi", price: 3000 },
    { label: "Sữa yến mạch", price: 5000 },
  ];
  const selectedMilk = milkOptions.find((option) => option.label === milk) || milkOptions[1];
  const milkTotal = hasDrinkCustomizations ? selectedMilk.price : 0;

  const toppingTotal = useMemo(
    () =>
      Object.entries(selectedToppings).reduce((sum, [name, count]) => {
        const topping = availableToppings.find((item) => item.name === name);
        return sum + (topping ? topping.price * count : 0);
      }, 0),
    [availableToppings, selectedToppings]
  );

  const selectedToppingNotes = useMemo(
    () =>
      Object.entries(selectedToppings)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => `${name} x${count}`),
    [selectedToppings]
  );

  const total = (size.price + toppingTotal + milkTotal) * qty;

  useEffect(() => {
    setComboItems(product.comboItems || []);
    if (product.kind !== "combo" || !product.comboId || product.comboItems?.length) {
      setComboItemsLoading(false);
      return;
    }

    let cancelled = false;
    setComboItemsLoading(true);
    loadComboItems(product, menuProducts)
      .then((items) => {
        if (!cancelled) setComboItems(items);
      })
      .catch(() => {
        if (!cancelled) setComboItems([]);
      })
      .finally(() => {
        if (!cancelled) setComboItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [menuProducts, product]);

  const handleAdd = () => {
    const preferences = [
      hasDrinkCustomizations && variant && `Kiểu: ${variant}`,
      hasDrinkCustomizations && `Đá: ${ice}`,
      hasDrinkCustomizations && `Đường: ${sugar}`,
      hasDrinkCustomizations && `Sữa: ${milk}${milkTotal ? ` (+${formatVND(milkTotal)})` : ""}`,
      selectedToppingNotes.length > 0 && `Topping: ${selectedToppingNotes.join(", ")}`,
      isCombo && comboItems.length > 0 && `Combo: ${comboItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}`,
      note && `Ghi chú: ${note}`,
    ].filter(Boolean).join(" | ");

    addToCart({
      id: `${product.id}-${size.size}-${Date.now()}`,
      productId: isCombo ? undefined : product.productId,
      comboId: isCombo ? product.comboId : undefined,
      name: product.name,
      price: size.price + toppingTotal + milkTotal,
      qty,
      size: size.size,
      sizeId: isCombo ? undefined : size.sizeId,
      note: preferences,
      image: product.image,
    });
    toast.success(`Đã thêm "${product.name}" vào giỏ!`);
    onClose();
  };

  const options = [
    { label: "Đá", value: ice, set: setIce, opts: ["Không", "Ít", "Bình thường", "Nhiều"] },
    { label: "Đường", value: sugar, set: setSugar, opts: ["Không", "Ít", "Vừa", "Nhiều"] },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl md:flex-row md:rounded-3xl"
        style={{ background: "var(--bg-primary)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "white", border: "1px solid var(--border-line)" }}>
          <X size={18} />
        </button>

        <div className="aspect-square md:w-1/2 md:aspect-auto" style={{ background: "var(--bg-card)" }}>
          <ImageWithFallback src={productImg(product.image)} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col overflow-y-auto md:w-1/2">
          <div className="space-y-5 p-6">
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>{product.name}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{product.description}</p>
              <div className="mt-2 text-xl font-bold" style={{ color: "var(--brand-brown)" }}>{formatVND(size.price)}</div>
            </div>

            {isCombo && (
              <div>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>THÀNH PHẦN COMBO</div>
                {comboItemsLoading ? (
                  <div className="rounded-lg p-3 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
                    Dang tai thanh phan combo...
                  </div>
                ) : comboItems.length > 0 ? (
                  <div className="space-y-2">
                    {comboItems.map((item) => (
                      <div key={`${product.id}-${item.productId}`} className="flex items-center justify-between rounded-lg p-3" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{item.name}</div>
                          {item.price ? (
                            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatVND(item.price)}</div>
                          ) : null}
                        </div>
                        <div className="ml-3 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "var(--bg-section)", color: "var(--brand-brown)" }}>
                          x{item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg p-3 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
                    Chưa cấu hình sản phẩm trong combo.
                  </div>
                )}
              </div>
            )}

            {hasVariants && (
              <div>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>BIẾN THỂ</div>
                <div className="flex gap-2">
                  {(product.variants || []).map((item) => (
                    <button
                      key={item}
                      onClick={() => setVariant(item)}
                      className="rounded-full px-4 py-2 text-sm transition ui-text"
                      style={{
                        background: variant === item ? "var(--brand-brown)" : "transparent",
                        color: variant === item ? "var(--bg-primary)" : "var(--text-secondary)",
                        border: "1.5px solid " + (variant === item ? "var(--brand-brown)" : "var(--border-line)"),
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasConfiguredSizes && (
              <div>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>SIZE</div>
                <div className="grid grid-cols-3 gap-2">
                  {configuredSizes.map((item) => (
                    <button
                      key={item.size}
                      onClick={() => setSize(item)}
                      className="rounded-xl p-3 text-center transition"
                      style={{
                        background: size.size === item.size ? "var(--bg-section)" : "white",
                        border: "1.5px solid " + (size.size === item.size ? "var(--brand-brown)" : "var(--border-line)"),
                      }}
                    >
                      <div className="font-semibold">{item.size}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--brand-brown)" }}>{formatVND(item.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasDrinkCustomizations && options.map((option) => (
              <div key={option.label}>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>{option.label.toUpperCase()}</div>
                <div className="flex flex-wrap gap-2">
                  {option.opts.map((item) => (
                    <button
                      key={item}
                      onClick={() => option.set(item)}
                      className="rounded-full px-3 py-1.5 text-sm transition"
                      style={{
                        background: option.value === item ? "var(--bg-card)" : "transparent",
                        color: option.value === item ? "var(--text-primary)" : "var(--text-secondary)",
                        border: "1px solid " + (option.value === item ? "var(--brand-hover)" : "var(--border-line)"),
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {hasDrinkCustomizations && (
              <div>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>SỮA</div>
                <div className="grid grid-cols-2 gap-2">
                  {milkOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setMilk(option.label)}
                      className="rounded-xl p-3 text-left text-sm transition"
                      style={{
                        background: milk === option.label ? "var(--bg-card)" : "transparent",
                        color: milk === option.label ? "var(--text-primary)" : "var(--text-secondary)",
                        border: "1px solid " + (milk === option.label ? "var(--brand-hover)" : "var(--border-line)"),
                      }}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--brand-brown)" }}>
                        {option.price > 0 ? `+${formatVND(option.price)}` : "Không phụ phí"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableToppings.length > 0 && (
              <div>
                <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>TOPPING (TỐI ĐA 5)</div>
                <div className="space-y-2">
                  {availableToppings.slice(0, 6).map((topping) => {
                    const count = selectedToppings[topping.name] || 0;
                    return (
                      <div key={topping.name} className="flex items-center justify-between rounded-lg p-2" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                        <div>
                          <div className="text-sm font-medium">{topping.name}</div>
                          <div className="text-xs" style={{ color: "var(--brand-brown)" }}>+{formatVND(topping.price)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedToppings((state) => ({ ...state, [topping.name]: Math.max(0, count - 1) }))}
                            className="h-7 w-7 rounded-full border"
                            style={{ borderColor: "var(--border-line)" }}
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm">{count}</span>
                          <button
                            onClick={() => setSelectedToppings((state) => ({ ...state, [topping.name]: Math.min(5, count + 1) }))}
                            className="h-7 w-7 rounded-full border"
                            style={{ borderColor: "var(--border-line)" }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 text-xs ui-text" style={{ color: "var(--text-secondary)" }}>GHI CHÚ</div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 100))}
                placeholder={isFood ? "Làm nóng, cắt đôi..." : "Ít đường, không kem..."}
                className="w-full resize-none rounded-lg p-3 text-sm outline-none"
                rows={2}
                style={{ background: "white", border: "1px solid var(--border-line)" }}
              />
            </div>
          </div>

          <div className="sticky bottom-0 mt-auto border-t p-6" style={{ borderColor: "var(--border-line)", background: "var(--bg-primary)" }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: "var(--border-line)" }}><Minus size={16} /></button>
                <span className="w-6 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: "var(--border-line)" }}><Plus size={16} /></button>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>{formatVND(total)}</div>
            </div>
            <button
              onClick={handleAdd}
              className="w-full rounded-xl py-3.5 font-semibold transition ui-text hover:scale-[1.02]"
              style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
            >
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
