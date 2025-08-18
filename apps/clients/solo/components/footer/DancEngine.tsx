import Image from 'next/image'
import Link from 'next/link';
const DanceEngineFooter = ({ org, mode = 'dark' }: { org?: string, mode?: string }) => {
  const backClasses = mode === 'dark' ? 'bg-de-background-dark text-white' : 'bg-white text-gray-800';
  return (
    <footer className={`p-4 flex items-baseline gap-3 justify-center  ${backClasses}`}>
      <p className='text-xs'>Powered by</p> 
      <Link href={`https://danceengine.co.uk?src=client_footer&org=${org || 'unknown'}`}>
        <Image src="/dance-engine-logo.png" className="inline-block" width={200} height={20} alt="Dance Engine" />
      </Link>
    </footer>
  );
};

export default DanceEngineFooter;