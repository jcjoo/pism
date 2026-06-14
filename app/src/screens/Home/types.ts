export type DueStatus = 'overdue' | 'today' | 'future';

export interface CalendarPayment {
  saleId:             string;
  clientName:         string;
  amount:             number;
  status:             DueStatus;
  installmentNumber?: number;
  installmentTotal?:  number;
}
