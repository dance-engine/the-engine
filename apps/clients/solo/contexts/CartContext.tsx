import { ItemType } from '@dance-engine/schemas/bundle';
import { EventModelType } from '@dance-engine/schemas/events';
import React, { createContext, useReducer, useCallback } from 'react';
import { usePassSelectorState } from './PassSelectorContext';
import { StripeMultiPurchaseButton } from '@/components/StripePurchaseButton';
import { OrganisationType } from '@dance-engine/schemas/organisation';
type CartSelectorState = { items: ItemType[] };

const initialSelection: CartSelectorState = { items: [] };

export const CartSelectorContext = createContext<CartSelectorState>(initialSelection);

type Action =
  | { type: 'add'; items: ItemType[] }
  

function reducer(state: CartSelectorState, action: Action): CartSelectorState {
  console.log('pass Selector Action:', action);
  switch (action.type) {
    

    default:
      return state;
  }
}

export function CartProvider({ event, org, children }: { event: EventModelType; org: OrganisationType; children?: React.ReactNode }) {
  const [state] = useReducer(reducer, {...initialSelection});
  const { selected } = usePassSelectorState()

  const items = useCallback(() => {
    const items = selected.map((ksuid) => event.items?.[ksuid])
    const bundles = event.bundles?.filter((bundle) => selected.includes(bundle.ksuid)).map((bundle) => {
      return bundle
    }) || []
    return [...items, ...bundles].filter(Boolean)
  },[selected,event])

  const priceIds = items().map((item) => item?.stripe_price_id).filter(Boolean) as string[];
  const cartAmount = items().reduce((total, item) => total + (item?.primary_price || 0), 0);

  return (
      <CartSelectorContext.Provider value={state}>
        {children}
        <h2 className='mt-6 text-xl'>Total Cost: £{(cartAmount/100).toFixed(2)}</h2>

        { lineItems() ? <StripeMultiPurchaseButton 
            accountId={org ? org.account_id || 'acct_1Ry9rvDqtDds31FK' : 'acct_1Ry9rvDqtDds31FK'} 
            org={org}
            // priceIds={priceIds} 
            lineItems={lineItems()}
            cartValue={cartAmount} 
            label="Checkout Now" className='text-de-background-dark px-6 py-3 bg-pear-logo rounded text-xl mt-6'
          /> 
            : "Nothing to add" }
        {/* <pre>BUNDLES{JSON.stringify(event.bundles, null, 2)}</pre>
        <pre>ITEMS{JSON.stringify(lineItems(), null, 2)}</pre> */}
      </CartSelectorContext.Provider>
  )
}
