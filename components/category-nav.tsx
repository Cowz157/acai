"use client"

import { homeCategories } from "@/lib/data"

export function CategoryNav() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      const yOffset = -70
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-0 z-30 bg-primary shadow-md">
      <div className="mx-auto max-w-6xl">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto px-2 md:justify-center md:gap-4 md:px-4">
          {homeCategories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <a
                href={`#${cat.id}`}
                onClick={(e) => handleClick(e, cat.id)}
                className="block whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-white/90 transition hover:text-white md:text-base"
              >
                {cat.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
