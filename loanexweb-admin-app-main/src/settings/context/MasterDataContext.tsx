import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  BrandMaster,
  CategoryMaster,
  CategoryTree,
  DealerMaster,
  DeliveryPartnerMaster,
  DeliveryZoneMaster,
  BranchMaster,
  PincodeMaster,
  SupplierMaster,
  WarehouseMaster,
  WholesalerMaster,
  createMasterId,
  isActiveStatus,
} from '../types/masterData';
import {
  seedBrands,
  seedBranches,
  seedCategories,
  seedDealers,
  seedDeliveryPartners,
  seedDeliveryZones,
  seedPincodes,
  seedSuppliers,
  seedWarehouses,
  seedWholesalers,
} from '../data/masterSeeds';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

type NameDraft = { name: string };

function normalizeName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed || null;
}

function nameTaken(
  items: { id: string; name: string }[],
  name: string,
  excludeId?: string,
): boolean {
  const lower = name.toLowerCase();
  return items.some(
    (item) => item.id !== excludeId && item.name.toLowerCase() === lower,
  );
}

function buildCategoryTree(
  categories: CategoryMaster[],
  activeOnly: boolean,
): CategoryTree {
  const filtered = activeOnly
    ? categories.filter((c) => isActiveStatus(c.status))
    : categories;

  const sorted = [...filtered].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
  );

  const tops = sorted.filter((c) => !c.parentId);
  const tree: CategoryTree = {};

  for (const top of tops) {
    const subs = sorted.filter((c) => c.parentId === top.id);
    tree[top.name] = {};
    for (const sub of subs) {
      tree[top.name][sub.name] = [];
    }
  }
  return tree;
}

export interface MasterDataContextType {
  brands: BrandMaster[];
  suppliers: SupplierMaster[];
  dealers: DealerMaster[];
  wholesalers: WholesalerMaster[];
  warehouses: WarehouseMaster[];
  deliveryPartners: DeliveryPartnerMaster[];
  deliveryZones: DeliveryZoneMaster[];
  categories: CategoryMaster[];
  branches: BranchMaster[];
  pincodes: PincodeMaster[];

  /** Wizard-compatible nested map (active categories only). */
  categoryTree: CategoryTree;

  // —— Brands ——
  saveBrand: (data: Omit<BrandMaster, 'id'> & { id?: string }) => boolean;
  deleteBrand: (id: string) => void;
  addBrand: (name: string) => boolean;
  renameBrand: (from: string, to: string) => boolean;
  deleteBrandByName: (name: string) => void;

  // —— Categories ——
  saveCategory: (data: Omit<CategoryMaster, 'id'> & { id?: string }) => boolean;
  deleteCategory: (id: string) => void;
  addCategory: (name: string) => boolean;
  renameCategory: (from: string, to: string) => boolean;
  deleteCategoryByName: (name: string) => void;
  addSubCategory: (parentName: string, name: string) => boolean;
  renameSubCategory: (parentName: string, from: string, to: string) => boolean;
  deleteSubCategory: (parentName: string, name: string) => void;

  // —— Suppliers ——
  saveSupplier: (data: Omit<SupplierMaster, 'id'> & { id?: string }) => boolean;
  deleteSupplier: (id: string) => void;
  addSupplier: (name: string) => boolean;
  renameSupplier: (from: string, to: string) => boolean;
  deleteSupplierByName: (name: string) => void;
  findSupplierByName: (name: string) => SupplierMaster | undefined;

  // —— Dealers ——
  saveDealer: (data: Omit<DealerMaster, 'id'> & { id?: string }) => boolean;
  deleteDealer: (id: string) => void;
  addDealer: (name: string) => boolean;
  renameDealer: (from: string, to: string) => boolean;
  deleteDealerByName: (name: string) => void;
  findDealerByName: (name: string) => DealerMaster | undefined;

  // —— Wholesalers ——
  saveWholesaler: (data: Omit<WholesalerMaster, 'id'> & { id?: string }) => boolean;
  deleteWholesaler: (id: string) => void;
  addWholesaler: (name: string) => boolean;
  renameWholesaler: (from: string, to: string) => boolean;
  deleteWholesalerByName: (name: string) => void;

  // —— Warehouses ——
  saveWarehouse: (data: Omit<WarehouseMaster, 'id'> & { id?: string }) => boolean;
  deleteWarehouse: (id: string) => void;
  addWarehouse: (name: string) => boolean;
  renameWarehouse: (from: string, to: string) => boolean;
  deleteWarehouseByName: (name: string) => void;

  // —— Delivery Partners ——
  saveDeliveryPartner: (
    data: Omit<DeliveryPartnerMaster, 'id'> & { id?: string },
  ) => boolean;
  deleteDeliveryPartner: (id: string) => void;
  addDeliveryPartner: (name: string) => boolean;
  renameDeliveryPartner: (from: string, to: string) => boolean;
  deleteDeliveryPartnerByName: (name: string) => void;

  // —— Delivery Zones ——
  saveDeliveryZone: (data: Omit<DeliveryZoneMaster, 'id'> & { id?: string }) => boolean;
  deleteDeliveryZone: (id: string) => void;
  addDeliveryZone: (name: string) => boolean;
  renameDeliveryZone: (from: string, to: string) => boolean;
  deleteDeliveryZoneByName: (name: string) => void;

  // —— Branches ——
  saveBranch: (data: Omit<BranchMaster, 'id'> & { id?: string }) => boolean;

  // —— Pincodes ——
  savePincode: (
    data: Omit<PincodeMaster, 'id' | 'name'> & { id?: string; name?: string },
  ) => boolean;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState(seedBrands);
  const [categories, setCategories] = useState(seedCategories);
  const [suppliers, setSuppliers] = useState(seedSuppliers);
  const [dealers, setDealers] = useState(seedDealers);
  const [wholesalers, setWholesalers] = useState(seedWholesalers);
  const [warehouses, setWarehouses] = useState(seedWarehouses);
  const [deliveryPartners, setDeliveryPartners] = useState(seedDeliveryPartners);
  const [deliveryZones, setDeliveryZones] = useState(seedDeliveryZones);
  const [branches, setBranches] = useState(seedBranches);
  const [pincodes, setPincodes] = useState(seedPincodes);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const apiCats: CategoryMaster[] = data.data.map((cat: any, index: number) => ({
            id: cat.id,
            name: cat.name,
            parentId: null,
            displayOrder: cat.sortOrder ?? index,
            status: cat.status || 'active',
          }));
          setCategories(apiCats);
        }
      })
      .catch((err) => console.warn('Unable to load categories from API:', err));
  }, []);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories, true),
    [categories],
  );

  const value = useMemo<MasterDataContextType>(() => {
    const saveNamed = <T extends { id: string; name: string }>(
      list: T[],
      setList: React.Dispatch<React.SetStateAction<T[]>>,
      data: Omit<T, 'id'> & { id?: string },
      idPrefix: string,
    ): boolean => {
      const name = normalizeName(data.name);
      if (!name) return false;
      if (nameTaken(list, name, data.id)) return false;
      if (data.id) {
        setList((prev) =>
          prev.map((item) =>
            item.id === data.id ? ({ ...item, ...data, name } as T) : item,
          ),
        );
      } else {
        setList((prev) => [
          ...prev,
          { ...data, id: createMasterId(idPrefix), name } as T,
        ]);
      }
      return true;
    };

    const addByName = <T extends { id: string; name: string; status: string }>(
      list: T[],
      setList: React.Dispatch<React.SetStateAction<T[]>>,
      name: string,
      idPrefix: string,
      extra: Partial<T> = {},
    ): boolean => {
      const trimmed = normalizeName(name);
      if (!trimmed || nameTaken(list, trimmed)) return false;
      setList((prev) => [
        ...prev,
        {
          id: createMasterId(idPrefix),
          name: trimmed,
          status: 'active',
          ...extra,
        } as T,
      ]);
      return true;
    };

    const renameByName = <T extends { id: string; name: string }>(
      list: T[],
      setList: React.Dispatch<React.SetStateAction<T[]>>,
      from: string,
      to: string,
    ): boolean => {
      const trimmed = normalizeName(to);
      if (!trimmed) return false;
      const target = list.find((item) => item.name === from);
      if (!target) return false;
      if (nameTaken(list, trimmed, target.id)) return false;
      setList((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, name: trimmed } : item)),
      );
      return true;
    };

    const deleteByName = <T extends { name: string }>(
      setList: React.Dispatch<React.SetStateAction<T[]>>,
      name: string,
    ) => {
      setList((prev) => prev.filter((item) => item.name !== name));
    };

    return {
      brands,
      suppliers,
      dealers,
      wholesalers,
      warehouses,
      deliveryPartners,
      deliveryZones,
      categories,
      categoryTree,
      branches,
      pincodes,

      saveBrand: (data) => saveNamed(brands, setBrands, data, 'brand'),
      deleteBrand: (id) => setBrands((prev) => prev.filter((b) => b.id !== id)),
      addBrand: (name) => addByName(brands, setBrands, name, 'brand'),
      renameBrand: (from, to) => renameByName(brands, setBrands, from, to),
      deleteBrandByName: (name) => deleteByName(setBrands, name),

      saveCategory: (data) => {
        const name = normalizeName(data.name);
        if (!name) return false;

        const isEdit = !!data.id;
        const url = isEdit
          ? `${API_BASE_URL}/api/v1/categories/${data.id}`
          : `${API_BASE_URL}/api/v1/categories`;
        const method = isEdit ? 'PUT' : 'POST';

        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            status: data.status || 'active',
            sortOrder: data.displayOrder || 0,
          }),
        })
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success && resData.data) {
              const saved = resData.data;
              setCategories((prev) => {
                const exists = prev.some((c) => c.id === saved.id);
                if (exists) {
                  return prev.map((c) =>
                    c.id === saved.id ? { ...c, name: saved.name, status: saved.status } : c,
                  );
                }
                return [
                  ...prev,
                  {
                    id: saved.id,
                    name: saved.name,
                    parentId: data.parentId ?? null,
                    displayOrder: saved.sortOrder ?? 0,
                    status: saved.status || 'active',
                  },
                ];
              });
            }
          })
          .catch((err) => console.warn('Failed to save category to API:', err));

        // Optimistic local state update
        if (data.id) {
          setCategories((prev) =>
            prev.map((c) => (c.id === data.id ? { ...c, ...data, name } : c)),
          );
        } else {
          setCategories((prev) => [
            ...prev,
            { ...data, id: createMasterId('cat'), name, parentId: data.parentId ?? null },
          ]);
        }
        return true;
      },
      deleteCategory: (id) => {
        fetch(`${API_BASE_URL}/api/v1/categories/${id}`, { method: 'DELETE' }).catch((err) =>
          console.warn('Failed to delete category from API:', err),
        );
        setCategories((prev) => prev.filter((c) => c.id !== id));
      },
      addCategory: (name) =>
        addByName(categories, setCategories, name, 'cat', {
          parentId: null,
        } as Partial<CategoryMaster>),
      renameCategory: (from, to) => {
        const trimmed = normalizeName(to);
        if (!trimmed) return false;
        const target = categories.find((c) => !c.parentId && c.name === from);
        if (!target) return false;
        const siblings = categories.filter(
          (c) => !c.parentId && c.id !== target.id,
        );
        if (siblings.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return false;
        setCategories((prev) =>
          prev.map((c) => (c.id === target.id ? { ...c, name: trimmed } : c)),
        );
        return true;
      },
      deleteCategoryByName: (name) => {
        const target = categories.find((c) => !c.parentId && c.name === name);
        if (!target) return;
        setCategories((prev) => {
          const childIds = new Set(
            prev.filter((c) => c.parentId === target.id).map((c) => c.id),
          );
          return prev.filter((c) => c.id !== target.id && !childIds.has(c.id));
        });
      },
      addSubCategory: (parentName, name) => {
        const trimmed = normalizeName(name);
        if (!trimmed) return false;
        const parent = categories.find((c) => !c.parentId && c.name === parentName);
        if (!parent) return false;
        const siblings = categories.filter((c) => c.parentId === parent.id);
        if (siblings.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return false;
        setCategories((prev) => [
          ...prev,
          {
            id: createMasterId('cat'),
            name: trimmed,
            parentId: parent.id,
            status: 'active',
          },
        ]);
        return true;
      },
      renameSubCategory: (parentName, from, to) => {
        const trimmed = normalizeName(to);
        if (!trimmed) return false;
        const parent = categories.find((c) => !c.parentId && c.name === parentName);
        if (!parent) return false;
        const target = categories.find(
          (c) => c.parentId === parent.id && c.name === from,
        );
        if (!target) return false;
        const siblings = categories.filter(
          (c) => c.parentId === parent.id && c.id !== target.id,
        );
        if (siblings.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return false;
        setCategories((prev) =>
          prev.map((c) => (c.id === target.id ? { ...c, name: trimmed } : c)),
        );
        return true;
      },
      deleteSubCategory: (parentName, name) => {
        const parent = categories.find((c) => !c.parentId && c.name === parentName);
        if (!parent) return;
        setCategories((prev) =>
          prev.filter((c) => !(c.parentId === parent.id && c.name === name)),
        );
      },

      saveSupplier: (data) => saveNamed(suppliers, setSuppliers, data, 'supplier'),
      deleteSupplier: (id) => setSuppliers((prev) => prev.filter((s) => s.id !== id)),
      addSupplier: (name) => addByName(suppliers, setSuppliers, name, 'supplier'),
      renameSupplier: (from, to) => renameByName(suppliers, setSuppliers, from, to),
      deleteSupplierByName: (name) => deleteByName(setSuppliers, name),
      findSupplierByName: (name) => suppliers.find((s) => s.name === name),

      saveDealer: (data) => saveNamed(dealers, setDealers, data, 'dealer'),
      deleteDealer: (id) => setDealers((prev) => prev.filter((d) => d.id !== id)),
      addDealer: (name) => addByName(dealers, setDealers, name, 'dealer'),
      renameDealer: (from, to) => renameByName(dealers, setDealers, from, to),
      deleteDealerByName: (name) => deleteByName(setDealers, name),
      findDealerByName: (name) => dealers.find((d) => d.name === name),

      saveWholesaler: (data) =>
        saveNamed(wholesalers, setWholesalers, data, 'wholesaler'),
      deleteWholesaler: (id) =>
        setWholesalers((prev) => prev.filter((w) => w.id !== id)),
      addWholesaler: (name) => addByName(wholesalers, setWholesalers, name, 'wholesaler'),
      renameWholesaler: (from, to) =>
        renameByName(wholesalers, setWholesalers, from, to),
      deleteWholesalerByName: (name) => deleteByName(setWholesalers, name),

      saveWarehouse: (data) => saveNamed(warehouses, setWarehouses, data, 'warehouse'),
      deleteWarehouse: (id) =>
        setWarehouses((prev) => prev.filter((w) => w.id !== id)),
      addWarehouse: (name) => addByName(warehouses, setWarehouses, name, 'warehouse'),
      renameWarehouse: (from, to) => renameByName(warehouses, setWarehouses, from, to),
      deleteWarehouseByName: (name) => deleteByName(setWarehouses, name),

      saveDeliveryPartner: (data) =>
        saveNamed(deliveryPartners, setDeliveryPartners, data, 'partner'),
      deleteDeliveryPartner: (id) =>
        setDeliveryPartners((prev) => prev.filter((p) => p.id !== id)),
      addDeliveryPartner: (name) =>
        addByName(deliveryPartners, setDeliveryPartners, name, 'partner', {
          serviceableZones: [],
        } as Partial<DeliveryPartnerMaster>),
      renameDeliveryPartner: (from, to) => {
        const ok = renameByName(deliveryPartners, setDeliveryPartners, from, to);
        return ok;
      },
      deleteDeliveryPartnerByName: (name) => deleteByName(setDeliveryPartners, name),

      saveDeliveryZone: (data) => {
        const ok = saveNamed(deliveryZones, setDeliveryZones, data, 'zone');
        if (ok && data.id) {
          const old = deliveryZones.find((z) => z.id === data.id);
          if (old && old.name !== data.name.trim()) {
            const newName = data.name.trim();
            setDeliveryPartners((prev) =>
              prev.map((p) => ({
                ...p,
                serviceableZones: (p.serviceableZones || []).map((z) =>
                  z === old.name ? newName : z,
                ),
              })),
            );
          }
        }
        return ok;
      },
      deleteDeliveryZone: (id) => {
        const zone = deliveryZones.find((z) => z.id === id);
        setDeliveryZones((prev) => prev.filter((z) => z.id !== id));
        if (zone) {
          setDeliveryPartners((prev) =>
            prev.map((p) => ({
              ...p,
              serviceableZones: (p.serviceableZones || []).filter((z) => z !== zone.name),
            })),
          );
        }
      },
      addDeliveryZone: (name) => addByName(deliveryZones, setDeliveryZones, name, 'zone'),
      renameDeliveryZone: (from, to) => {
        const trimmed = normalizeName(to);
        if (!trimmed) return false;
        const ok = renameByName(deliveryZones, setDeliveryZones, from, to);
        if (ok) {
          setDeliveryPartners((prev) =>
            prev.map((p) => ({
              ...p,
              serviceableZones: (p.serviceableZones || []).map((z) =>
                z === from ? trimmed : z,
              ),
            })),
          );
        }
        return ok;
      },
      deleteDeliveryZoneByName: (name) => {
        deleteByName(setDeliveryZones, name);
        setDeliveryPartners((prev) =>
          prev.map((p) => ({
            ...p,
            serviceableZones: (p.serviceableZones || []).filter((z) => z !== name),
          })),
        );
      },

      saveBranch: (data) => {
        const name = normalizeName(data.name);
        const branchCode = normalizeName(data.branchCode);
        if (!name || !branchCode) return false;
        if (nameTaken(branches, name, data.id)) return false;
        if (
          branches.some(
            (b) =>
              b.id !== data.id &&
              b.branchCode.toLowerCase() === branchCode.toLowerCase(),
          )
        ) {
          return false;
        }

        const payload = {
          ...data,
          name,
          branchCode,
          city: data.city.trim(),
          state: data.state.trim(),
          branchManager: data.branchManager.trim(),
          mobile: data.mobile.trim(),
        };

        if (data.id) {
          const old = branches.find((b) => b.id === data.id);
          setBranches((prev) =>
            prev.map((item) => (item.id === data.id ? { ...item, ...payload } : item)),
          );
          if (old && old.name !== name) {
            setPincodes((prev) =>
              prev.map((p) =>
                p.branchName === old.name ? { ...p, branchName: name } : p,
              ),
            );
          }
        } else {
          setBranches((prev) => [
            ...prev,
            { ...payload, id: createMasterId('branch') } as BranchMaster,
          ]);
        }
        return true;
      },

      savePincode: (data) => {
        const pincode = normalizeName(data.pincode);
        if (!pincode) return false;
        if (pincodes.some((p) => p.id !== data.id && p.pincode === pincode)) {
          return false;
        }
        if (!normalizeName(data.branchName || '')) return false;

        const payload: PincodeMaster = {
          id: data.id || createMasterId('pincode'),
          name: pincode,
          pincode,
          city: data.city.trim(),
          state: data.state.trim(),
          branchName: data.branchName.trim(),
          status: data.status,
        };

        if (data.id) {
          setPincodes((prev) =>
            prev.map((item) => (item.id === data.id ? payload : item)),
          );
        } else {
          setPincodes((prev) => [...prev, payload]);
        }
        return true;
      },
    };
  }, [
    brands,
    categories,
    categoryTree,
    suppliers,
    dealers,
    wholesalers,
    warehouses,
    deliveryPartners,
    deliveryZones,
    branches,
    pincodes,
  ]);

  return (
    <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext);
  if (!ctx) throw new Error('useMasterData must be used within MasterDataProvider');
  return ctx;
}

/** Active display names for wizard dropdowns. */
export function activeNames<T extends { name: string; status: string }>(
  items: T[],
): string[] {
  return items.filter((i) => i.status === 'active').map((i) => i.name);
}
