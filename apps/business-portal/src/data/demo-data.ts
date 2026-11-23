export const ORDER_STATUSES = [
  "Created",
  "Confirmed",
  "Laundry Received",
  "Processing",
  "Quality Check",
  "Ready for Collection",
  "Out for Delivery",
  "Collected",
  "Completed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DEMO_BRANCHES = [
  { id: "BR-001", name: "Westlands Studio", location: "Nairobi, Kenya", manager: "Nia Wanjiku", orders: 142, revenue: 684_200, status: "Open" },
  { id: "BR-002", name: "Kilimani Hub", location: "Nairobi, Kenya", manager: "David Otieno", orders: 118, revenue: 532_400, status: "Open" },
  { id: "BR-003", name: "Karen Collection Point", location: "Nairobi, Kenya", manager: "Mercy Njeri", orders: 86, revenue: 396_800, status: "Open" },
  { id: "BR-004", name: "Mombasa Road", location: "Nairobi, Kenya", manager: "Alex Kamau", orders: 54, revenue: 248_600, status: "Maintenance" },
];

export const DEMO_EMPLOYEES = [
  { id: "LF-1042", name: "Nia Wanjiku", email: "nia@laundryflow.co.ke", role: "Branch Manager", branch: "Westlands Studio", initials: "NW", status: "Active" },
  { id: "LF-1038", name: "David Otieno", email: "david@laundryflow.co.ke", role: "Branch Manager", branch: "Kilimani Hub", initials: "DO", status: "Active" },
  { id: "LF-1027", name: "Mercy Njeri", email: "mercy@laundryflow.co.ke", role: "Cashier", branch: "Karen Collection Point", initials: "MN", status: "Active" },
  { id: "LF-1019", name: "Brian Mwangi", email: "brian@laundryflow.co.ke", role: "Laundry Attendant", branch: "Westlands Studio", initials: "BM", status: "Active" },
  { id: "LF-1014", name: "Aisha Noor", email: "aisha@laundryflow.co.ke", role: "Delivery Rider", branch: "Kilimani Hub", initials: "AN", status: "Invited" },
  { id: "LF-1008", name: "Kevin Maina", email: "kevin@laundryflow.co.ke", role: "Accountant", branch: "All branches", initials: "KM", status: "Inactive" },
];

export const EMPLOYEE_ROLES = [
  "Business Owner",
  "Business Administrator",
  "Branch Manager",
  "Cashier",
  "Laundry Attendant",
  "Delivery Rider",
  "Accountant",
  "Customer Support",
] as const;

export const DEMO_ORDERS: { id: string; customer: string; service: string; branch: string; due: string; amount: number; status: OrderStatus; initials: string }[] = [
  { id: "LF-2841", customer: "Wanjiku Mwangi", service: "Wash & fold · 6.5 kg", branch: "Westlands Studio", due: "Today, 2:30 PM", amount: 1_950, status: "Processing", initials: "WM" },
  { id: "LF-2840", customer: "Peter Kamau", service: "Dry cleaning · 3 items", branch: "Kilimani Hub", due: "Today, 3:00 PM", amount: 2_400, status: "Quality Check", initials: "PK" },
  { id: "LF-2839", customer: "Zahra Ali", service: "Wash & iron · 4.2 kg", branch: "Karen Collection Point", due: "Today, 4:15 PM", amount: 1_680, status: "Ready for Collection", initials: "ZA" },
  { id: "LF-2838", customer: "James Ochieng", service: "Bedding · 2 pieces", branch: "Westlands Studio", due: "Today, 5:00 PM", amount: 3_200, status: "Laundry Received", initials: "JO" },
  { id: "LF-2837", customer: "Miriam Kilonzo", service: "Wash & fold · 8 kg", branch: "Kilimani Hub", due: "Tomorrow, 9:00 AM", amount: 2_400, status: "Confirmed", initials: "MK" },
  { id: "LF-2836", customer: "Samuel Kiptoo", service: "Premium care · 2 items", branch: "Karen Collection Point", due: "Tomorrow, 11:30 AM", amount: 2_800, status: "Out for Delivery", initials: "SK" },
  { id: "LF-2835", customer: "Faith Njoroge", service: "Wash & iron · 5 kg", branch: "Westlands Studio", due: "Yesterday, 4:00 PM", amount: 2_250, status: "Completed", initials: "FN" },
];

export const REVENUE_TREND = [
  { day: "Mon", revenue: 62, orders: 48 },
  { day: "Tue", revenue: 74, orders: 56 },
  { day: "Wed", revenue: 68, orders: 51 },
  { day: "Thu", revenue: 88, orders: 64 },
  { day: "Fri", revenue: 79, orders: 59 },
  { day: "Sat", revenue: 96, orders: 72 },
  { day: "Sun", revenue: 82, orders: 61 },
];

export const DEMO_TRANSACTIONS = [
  { id: "MP-7748", customer: "Wanjiku Mwangi", method: "M-Pesa · 07••• 4821", time: "10:42 AM", amount: 1_950, status: "Paid" },
  { id: "MP-7747", customer: "Peter Kamau", method: "M-Pesa · 07••• 1934", time: "10:18 AM", amount: 2_400, status: "Paid" },
  { id: "MP-7746", customer: "Zahra Ali", method: "Card · Visa •• 2068", time: "9:56 AM", amount: 1_680, status: "Paid" },
  { id: "MP-7745", customer: "James Ochieng", method: "M-Pesa · 07••• 6012", time: "9:32 AM", amount: 3_200, status: "Pending" },
];

export function formatKES(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}