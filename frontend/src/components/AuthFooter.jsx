import React from 'react'

const AuthFooter = () => {
  const links = [
    "Meta", "About", "Blog", "Jobs", "Help", "API", "Privacy", "Terms", "Locations", "Metagram Lite", "Threads", "Contact Uploading & Non-Users", "Meta Verified"
  ];

  return (
    <footer className="w-full max-w-[1200px] mx-auto py-10 px-4 text-center">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        {links.map((link) => (
          <a key={link} href="#" className="text-xs text-zinc-500 dark:text-zinc-500 hover:underline">{link}</a>
        ))}
      </div>
      <div className="flex justify-center items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
        <select className="bg-transparent border-none outline-none cursor-pointer text-zinc-500 dark:text-zinc-500">
          <option>English</option>
          <option>Hindi</option>
        </select>
        <span>© 2025 Metagram from Meta</span>
      </div>
    </footer>
  )
}

export default AuthFooter
