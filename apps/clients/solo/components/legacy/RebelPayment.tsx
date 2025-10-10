import StripePurchaseButton from '@/components/StripePurchaseButton';

export default function RebelPayment({org}: {org: {account_id: string}}) {
  const inProd = process.env.NODE_ENV == 'development' ? false : true;

  return (
    <div className='w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--main-bg-color)', borderColor: 'var(--highlight-color)'}}>
           <div className={`max-w-4xl px-4 lg:px-0 py-24 flex flex-col items-center\ `}>
            <h2 className='text-4xl font-bold mb-4'>Early Bird Tickets</h2>
            <div className='flex gap-6'>
            <StripePurchaseButton 
              label="Full Pass"
              accountId={org.account_id || 'acct_1Rkp1ODIMY9TzhzF'} //! Work out why accountID is missing
              priceId={ inProd ? "price_1RqCdDD1ZofqWwLaVBaPDg7a" : 'price_1RqCh1D1ZofqWwLa6AnG7NFD' } // 🔥 Live : 🔨 Test price ID
              couponCode={ inProd ? "d2JMEhDA" : 'uKXafk5e' } // 🔥 Live : 🔨 Test coupon code
              style={{backgroundColor: 'var(--highlight-color)'}} className='rounded px-8 py-6 text-4xl'  
            />
            <StripePurchaseButton 
              label="Party Ticket"
              accountId={org.account_id || 'acct_1Rkp1ODIMY9TzhzF'} //! Work out why accountID is missing
              priceId={ inProd ? "price_1RqCdeD1ZofqWwLanvCgSHEc" : 'price_1RqCgfD1ZofqWwLaTgffMKTU' } // 🔥 Live : 🔨 Test price ID
              couponCode={ inProd ? "NtYacUmF" : 'm8WbVzP7' } // 🔥 Live : 🔨 Test coupon code
              style={{backgroundColor: 'var(--highlight-color)'}} className='rounded px-8 py-6 text-4xl'  
            />
            </div>
            <div className='hidden'>{Date.now()}</div>

          </div>
          </div>
  )
}
