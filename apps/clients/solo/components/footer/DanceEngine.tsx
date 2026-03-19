import Image from 'next/image'
import Link from 'next/link';
const DanceEngineFooter = ({ org, mode = 'dark' }: { org?: string, mode?: string }) => {
  const backClasses = mode === 'dark' ? 'bg-de-background-dark text-white' : 'bg-white text-gray-800';
  return (
    <footer className={`p-4 flex items-baseline gap-3  self-stretch ${backClasses}`}>
      <div className='max-w-7xl px-4 sm:px-6 py-4 lg:flex-row lg:items-end lg:justify-between lg:px-8 mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4'>
        <div className="flex gap-8 ">
            <Link
              href="https://www.danceengine.co.uk/tos"
              className="transition hover:opacity-70"
            >
              Terms of Service
            </Link>
            <Link
              href="https://www.danceengine.co.uk/privacy"
              className="transition hover:opacity-70"
            >
              Privacy Policy
            </Link>
        </div>
      
        <div>
          <p className='text-xs'>Powered by</p> 
          <Link href={`https://danceengine.co.uk?src=client_footer&org=${org || 'unknown'}`}>
            <Image src="/dance-engine-logo.png" className="inline-block" width={200} height={20} alt="Dance Engine" />
          </Link>
        </div>
      </div>
      
    </footer>
  );
};

export default DanceEngineFooter;