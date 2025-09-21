'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import {
  FileImage,
  Scaling,
  QrCode,
  FilePlus,
  History,
  LayoutDashboard,
  FileArchive,
  ScanLine
} from "lucide-react";
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pdf-to-image', label: 'PDF to Image', icon: FileImage },
  { href: '/image-resizer', label: 'Image Resizer', icon: Scaling },
  { href: '/qr-code-generator', label: 'QR Code Generator', icon: QrCode },
  { href: '/image-to-pdf', label: 'Image to PDF', icon: FilePlus },
  { href: '/pdf-compressor', label: 'PDF Compressor', icon: FileArchive },
  { href: '/pdf-editor', label: 'PDF Editor', icon: ScanLine },
  { href: '/history', label: 'Task History', icon: History },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
