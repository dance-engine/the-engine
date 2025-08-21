import { ItemType } from '@dance-engine/schemas/bundle';
import { EventModelType } from '@dance-engine/schemas/events';
import React, { createContext, useReducer, useCallback } from 'react';
import { usePassSelectorState } from './PassSelectorContext';
import { StripeMultiPurchaseButton } from '@/components/StripePurchaseButton';

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

export function CartProvider({ event, children }: { event: EventModelType; children?: React.ReactNode }) {
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

  return (
      <CartSelectorContext.Provider value={state}>
        {children}
        { items() ? <StripeMultiPurchaseButton accountId='acct_1Ry9rvDqtDds31FK' priceIds={priceIds} label="Checkout Now" className='text-de-background-dark px-6 py-3 bg-pear-logo rounded text-xl mt-6'/> : "Nothing to add" }
        {/* <pre>{JSON.stringify(event.bundles, null, 2)}</pre> */}
        {/* <pre>{JSON.stringify(items(), null, 2)}</pre> */}
      </CartSelectorContext.Provider>
  )
}
