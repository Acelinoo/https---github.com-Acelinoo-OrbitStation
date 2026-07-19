// Navbar.jsx
const Navbar = () => {
  return (
    <nav className="fixed top-1 left-1/2 -translate-x-1/2 bg-white text-black rounded-[25px] px-5 py-2 flex justify-center items-center gap-6 sm:gap-10 z-50 shadow-md">
      {['Home', 'About', 'Works', 'Contact'].map((item) => (
        <a
          key={item}
          href={item === 'Home' ? '/' : `#${item.toLowerCase()}`}
          className="text-sm sm:text-[17px] font-bold uppercase hover:text-blue-500 transition-colors"
        >
          {item}
        </a>
      ))}
    </nav>
  );
};

export default Navbar;
