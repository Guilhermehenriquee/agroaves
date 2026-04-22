import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pdv", label: "PDV", icon: ShoppingCart },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "relatorios", label: "Relatorios", icon: BarChart3 },
  { id: "mensagens", label: "Mensagens", icon: MessageSquare },
  { id: "fiscal", label: "Fiscal", icon: FileText },
];
