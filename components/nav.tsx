import Link from "next/link";

const links = [
  { href: "/week-plan", label: "周计划" },
  { href: "/inventory", label: "库存" },
  { href: "/shopping-list", label: "采购清单" },
  { href: "/tools", label: "工具管理" },
  { href: "/preferences", label: "偏好设置" },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-primary/20 bg-[#fefdf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <div className="text-lg font-semibold text-primary">冷喵食堂</div>
          <div className="text-xs text-primary/70">家庭做饭规划 PWA</div>
        </div>
        <nav className="flex flex-wrap justify-end gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-primary/25 bg-white px-3 py-1 text-sm text-primary hover:bg-primary hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
