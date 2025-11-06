import { FC } from "react";

interface NavbarProps {
  pages: { name: string; href: string; current: boolean }[];
}

export const Navbar: FC<NavbarProps> = ({ pages }) => {
  return (
    <nav className="p-4 mt-0 w-full" style={{ 
      backgroundColor: '#7C3AED', 
      borderBottom: '1px solid #7C3AED',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div className="container mx-auto flex items-center">
        <div className="flex font-extrabold">
          <a
            className="flex text-base no-underline"
            style={{ color: '#FFFFFF' }}
            href="/"
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
          >
            <span className="hidden w-0 md:w-auto md:block pl-1">Homepage</span>
          </a>
        </div>
        <div className="flex pl-4 text-sm">
          <ul className="list-reset flex justify-between flex-1 md:flex-none items-center">
            {pages.map((page) => (
              <li className="mr-2" key={page.name}>
                <a
                  className="inline-block py-2 px-2 no-underline"
                  style={{ 
                    color: page.current ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: page.current ? 'bold' : 'normal'
                  }}
                  href={page.href}
                  onMouseEnter={(e) => {
                    if (!page.current) {
                      e.currentTarget.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!page.current) {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                >
                  {page.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};
