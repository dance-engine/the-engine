'use client'
import { useMenu } from './MenuContext'; // Import the custom hook

const MenuToggle = () => {
  const { toggleMenu } = useMenu();

  return (
      <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={toggleMenu}>
        <span className="sr-only">Open sidebar</span>
        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
  );
};

const MenuClose = () => {
  const { toggleMenu } = useMenu();
 
  return (
    <button type="button" className="-m-2.5 p-2.5 w-full h-full" onClick={toggleMenu}>
    <span className="sr-only">Close sidebar</span>
    <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"  aria-hidden={true} data-slot="icon">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  </button>
)
}

export {MenuToggle,MenuClose};
