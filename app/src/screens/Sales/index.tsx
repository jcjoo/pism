import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { FormScrollView } from "@/components";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useToast, useConfirm } from "@/components";

import { clientsService, Client } from "@/services/clients.service";
import { productsService, Product } from "@/services/products.service";
import { salesService, SaleFilters } from "@/services/sales.service";
import { recebimentosService } from "@/services/recebimentos.service";

import { Step, StatusFilter } from "./types";
import { calcTotal } from "./helpers";
import { SaleFilterStep } from "./SaleFilterStep";
import { SaleListStep } from "./SaleListStep";
import { SaleDetailsStep } from "./SaleDetailsStep";
import { SaleEditStep } from "./SaleEditStep";
import { ReceiptModal } from "./ReceiptModal";
import { SelectorModal } from "./SelectorModal";

export function Sales() {
  const toast = useToast();
  const confirm = useConfirm();
  const [step, setStep] = useState<Step>("filter");
  const [loading, setLoading] = useState(false);

  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  const [filterClient, setFilterClient] = useState<Client | null>(null);
  const [filterProduct, setFilterProduct] = useState<Product | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [dateFieldTarget, setDateFieldTarget] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [dueStart, setDueStart] = useState<Date | null>(null);
  const [dueEnd, setDueEnd] = useState<Date | null>(null);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const [editCart, setEditCart] = useState<any[]>([]);
  const [editDueDate, setEditDueDate] = useState<Date | null>(new Date());
  const [editPaymentMode, setEditPaymentMode] = useState("À vista");
  const [editObservation, setEditObservation] = useState("");

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptDate, setReceiptDate] = useState(new Date());
  const [receiptAmount, setReceiptAmount] = useState("");
  const [savingReceipt, setSavingReceipt] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"cliente" | "product">("cliente");

  useEffect(() => {
    const load = async () => {
      try {
        setClientsList(await clientsService.getAll(true));
        setProductsList(await productsService.getAll(true));
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleFetchSales = async () => {
    setLoading(true);
    try {
      const filters: SaleFilters = {
        clientId: filterClient?.id,
        dateStart: dateStart?.toISOString(),
        dateEnd: dateEnd?.toISOString(),
        dueStart: dueStart?.toISOString(),
        dueEnd: dueEnd?.toISOString(),
      };
      let results = (await salesService.getSales(filters)) || [];
      if (filterProduct)
        results = results.filter((s) =>
          s.sale_items.some((i: any) => i.product_id === filterProduct.id),
        );
      if (statusFilter === "received")
        results = results.filter((s) => !!s.received_at);
      if (statusFilter === "pending")
        results = results.filter((s) => !s.received_at);
      setSalesData(results);
      setStep("list");
    } catch (e: any) {
      toast.show(e.message, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Apagar Venda",
      message: "Deseja apagar esta venda?",
      confirmText: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await salesService.delete(selectedSale.id);
      toast.show("Venda apagada!", { type: "success" });
      setStep("filter");
      setSalesData([]);
    } catch (e: any) {
      toast.show(e.message, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditCart(
      selectedSale.sale_items.map((si: any) => ({
        id: si.id,
        product: si.products,
        quantity: si.quantity,
        price: si.price,
      })),
    );
    setEditDueDate(new Date(selectedSale.dueDate));
    setEditPaymentMode(
      selectedSale.payment === "cash"
        ? "À vista"
        : `${selectedSale.installments}x`,
    );
    setEditObservation(selectedSale.observation ?? "");
    setStep("edit");
  };

  const handleSaveEdit = async () => {
    toast.show("Fluxo de salvar a ser finalizado.", { type: "info" });
    setStep("details");
  };

  const switchPayment = () =>
    setEditPaymentMode((p) =>
      p === "À vista" ? "2x" : p === "2x" ? "3x" : "À vista",
    );

  const openEditReceipt = () => {
    setReceiptDate(
      selectedSale.received_at
        ? new Date(selectedSale.received_at)
        : new Date(),
    );
    setReceiptAmount(
      (selectedSale.received_amount ?? calcTotal(selectedSale.sale_items))
        .toFixed(2)
        .replace(".", ","),
    );
    setReceiptModalVisible(true);
  };

  const handleSaveReceipt = async () => {
    const num = parseFloat(receiptAmount.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      toast.show("Valor inválido.", { type: "error" });
      return;
    }
    setSavingReceipt(true);
    try {
      await recebimentosService.updateReceived(
        selectedSale.id,
        receiptDate.toISOString(),
        num,
      );
      const updated = {
        ...selectedSale,
        received_at: receiptDate.toISOString(),
        received_amount: num,
      };
      setSelectedSale(updated);
      setSalesData((p) => p.map((s) => (s.id === updated.id ? updated : s)));
      setReceiptModalVisible(false);
    } catch (e: any) {
      toast.show(e.message, { type: "error" });
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleRemoveReceipt = async () => {
    const ok = await confirm({
      title: "Remover recebimento",
      message: "Deseja desfazer este recebimento?",
      confirmText: "Remover",
      destructive: true,
    });
    if (!ok) return;
    setSavingReceipt(true);
    try {
      await recebimentosService.removeReceived(selectedSale.id);
      const updated = {
        ...selectedSale,
        received_at: null,
        received_amount: null,
      };
      setSelectedSale(updated);
      setSalesData((p) => p.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e: any) {
      toast.show(e.message, { type: "error" });
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleMarkReceived = () => {
    setReceiptDate(new Date());
    setReceiptAmount(
      calcTotal(selectedSale.sale_items).toFixed(2).replace(".", ","),
    );
    setReceiptModalVisible(true);
  };

  const selectModalItem = (item: any) => {
    if (modalType === "cliente") setFilterClient(item);
    else setFilterProduct(item);
    setModalVisible(false);
  };

  const totalAll = salesData.reduce((a, s) => a + calcTotal(s.sale_items), 0);
  const totalReceived = salesData
    .filter((s) => s.received_at)
    .reduce((a, s) => a + (s.received_amount ?? calcTotal(s.sale_items)), 0);
  const totalPending = salesData
    .filter((s) => !s.received_at)
    .reduce((a, s) => a + calcTotal(s.sale_items), 0);

  const openDate = (target: string) => {
    setDateFieldTarget(target);
    setShowDatePicker(true);
  };

  return (
    <View className="screen">
      <FormScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
      >
        {step === "filter" && (
          <SaleFilterStep
            filterClient={filterClient}
            filterProduct={filterProduct}
            statusFilter={statusFilter}
            dateStart={dateStart}
            dateEnd={dateEnd}
            dueStart={dueStart}
            dueEnd={dueEnd}
            loading={loading}
            onOpenModal={(type) => {
              setModalType(type);
              setModalVisible(true);
            }}
            onOpenDate={openDate}
            onSetStatus={setStatusFilter}
            onSearch={handleFetchSales}
            onClear={() => {
              setFilterClient(null);
              setFilterProduct(null);
              setDateStart(null);
              setDateEnd(null);
              setDueStart(null);
              setDueEnd(null);
              setStatusFilter("all");
            }}
          />
        )}

        {step === "list" && (
          <SaleListStep
            salesData={salesData}
            totalAll={totalAll}
            totalReceived={totalReceived}
            totalPending={totalPending}
            onSelectSale={(sale) => {
              setSelectedSale(sale);
              setStep("details");
            }}
            onBack={() => setStep("filter")}
            onNewSearch={() => {
              setStep("filter");
              setSalesData([]);
            }}
          />
        )}

        {step === "details" && selectedSale && (
          <SaleDetailsStep
            sale={selectedSale}
            savingReceipt={savingReceipt}
            onBack={() => setStep("list")}
            onEdit={startEdit}
            onMarkReceived={handleMarkReceived}
            onEditReceipt={openEditReceipt}
            onRemoveReceipt={handleRemoveReceipt}
          />
        )}

        {step === "edit" && selectedSale && (
          <SaleEditStep
            sale={selectedSale}
            editCart={editCart}
            setEditCart={setEditCart}
            editDueDate={editDueDate}
            editPaymentMode={editPaymentMode}
            editObservation={editObservation}
            setEditObservation={setEditObservation}
            loading={loading}
            onSave={handleSaveEdit}
            onCancel={() => setStep("details")}
            onDelete={handleDelete}
            switchPayment={switchPayment}
            onOpenDatePicker={openDate}
          />
        )}
      </FormScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (!date) return;
            if (dateFieldTarget === "dateStart") setDateStart(date);
            else if (dateFieldTarget === "dateEnd") setDateEnd(date);
            else if (dateFieldTarget === "dueStart") setDueStart(date);
            else if (dateFieldTarget === "dueEnd") setDueEnd(date);
            else if (dateFieldTarget === "editDueDate") setEditDueDate(date);
            else if (dateFieldTarget === "receiptDate") setReceiptDate(date);
          }}
        />
      )}

      <ReceiptModal
        visible={receiptModalVisible}
        clientName={selectedSale?.clients?.name}
        isEdit={!!selectedSale?.received_at}
        date={receiptDate}
        amount={receiptAmount}
        saving={savingReceipt}
        onChangeAmount={setReceiptAmount}
        onOpenDatePicker={() => openDate("receiptDate")}
        onConfirm={handleSaveReceipt}
        onCancel={() => setReceiptModalVisible(false)}
      />

      <SelectorModal
        visible={modalVisible}
        type={modalType}
        clients={clientsList}
        products={productsList}
        onSelect={selectModalItem}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
