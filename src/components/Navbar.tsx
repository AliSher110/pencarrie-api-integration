import Link from "next/link";
import { useRouter } from "next/router";
import { FC } from "react";

const navPages = [
  { name: "Products", href: "/products" },
  { name: "Orders", href: "/orders" },
];

export const Navbar: FC = () => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav className="bg-purple-600 shadow-md w-full">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Logo / Homepage */}
        <Link href="/">
          <span className="text-white font-extrabold text-lg cursor-pointer hover:opacity-80 transition-opacity">
            Homepage
          </span>
        </Link>

        {/* Navigation Links */}
        <ul className="flex space-x-4 text-sm">
          {navPages.map((page) => {
            const isCurrent = currentPath === page.href;
            return (
              <li key={page.name}>
                <Link href={page.href}>
                  <span
                    className={`px-3 py-2 rounded-md font-medium text-white cursor-pointer transition-opacity ${
                      isCurrent ? "font-bold underline" : "hover:opacity-80"
                    }`}
                  >
                    {page.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
