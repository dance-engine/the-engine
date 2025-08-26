import StripePurchaseButton from '@/components/StripePurchaseButton';

export default function POWPayment({org}: {org: {account_id: string}}) {
  const inProd = process.env.NODE_ENV == 'development' ? false : true;

  return (
    <div className='w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--main-bg-color)', borderColor: 'var(--highlight-color)'}}>
           <div className={`max-w-4xl px-4 lg:px-0 py-24 flex flex-col items-center\ `}>
            <h2 className='text-4xl font-bold mb-4'>Early Bird Ticket</h2>
            <p className='mb-6 text-xl'>We have a limited amount of early bird discounted tickets at only £40</p>
            <StripePurchaseButton 
              accountId={org.account_id || 'acct_1Rkp1ODIMY9TzhzF'} //! Work out why accountID is missing
              couponCode={ inProd ? "fVKhBZim" : 'u0trAdPd' } // 🔥 Live : 🔨 Test coupon code
              priceId={ inProd ? "price_1RkrE1DIMY9TzhzF2AFDc6q3" : 'price_1RnirUDIMY9TzhzFCSo3uo6K' } // 🔥 Live : 🔨 Test price ID
              style={{backgroundColor: 'var(--highlight-color)'}} className='rounded px-8 py-6 text-4xl'  
              cartValue={4000} 
            />
           </div>
        </div>
  )
}
